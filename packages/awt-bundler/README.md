# **awt-bundler** 🔱

#### _A custom bundler for use with <a href="https://www.npmjs.com/package/async-worker-ts">async-worker-ts</a>._

<br />

## Usage:

_add <b>awt-bundler</b> as a dev dependancy of the project_

```sh
npm i -D awt-bundler
```

_add a script to the package.json file_

```json
{
  "scripts": {
    "bundle": "awt-bundler dist"
  }
}
```

_run the bundler as the last step before running the project - here we're chaining it with the build script_

```json
{
  "scripts": {
    "bundle": "awt-bundler dist",
    "build": "tsc && npm run bundle",
    "dev": "npm run build && node dist/index.js"
  }
}
```
