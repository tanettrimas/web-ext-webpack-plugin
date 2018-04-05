'use strict';

const path = require('path');
const webExt = require('web-ext').default;

const pluginName = 'WebExtWebpackPlugin';

class WebExtWebpackPlugin {
  constructor() {
    this.runner = null;
    this.watchMode = false;
  }

  _run_web_ext({ sourceDir, artifactsDir }) {
    if (this.runner) {
      return;
    }

    return webExt.cmd.run({ sourceDir, artifactsDir, noReload: true, }, { })
    .then((runner) => {
      this.runner = runner;
      this.runner.registerCleanup(() => {
        this.runner = null;
      });
    });
  }

  apply(compiler) {
    const sourceDir = process.cwd();
    const artifactsDir = path.join(sourceDir, 'web-ext-artifacts');

    const watchRun = (compiler) => {
      this.watchMode = true;
    };

    const afterEmit = (compilation) => {
      try {
        return webExt.cmd.lint({
          artifactsDir,
          boring: false,
          metadata: false,
          output: 'text',
          pretty: false,
          sourceDir,
          verbose: false,
          warningsAsErrors: true,
        }, {
          shouldExitProgram: false,
        }).then(() => {
          if (!this.watchMode) {
            return;
          }

          if (this.runner) {
            this.runner.reloadAllExtensions();
            return;
          }
          return this._run_web_ext({ sourceDir, artifactsDir });
        });
      } catch (err) {
        console.log(err);
      }
    };

    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapPromise({ name: pluginName }, afterEmit);
      compiler.hooks.watchRun.tapPromise({ name: pluginName }, watchRun);
    } else {
      compiler.plugin('afterEmit', afterEmit);
      compiler.plugin('watchRun', watchRun);
    }
  }
}

module.exports = WebExtWebpackPlugin;
