
# General Usage

1. Clone Repo:

    ```bash
    git clone https://github.com/ml3rc/shotoverConfigLoader.git
    ```
2. Open Chromium based browser(Chrome, Brave, Edge...):

    Go into <b>extension settings menu</b>, then <b>enable developer</b> mode. After that you can <b>load a unpacked extension</b>, select <b>extension/dist</b> folder.

# Developing

Generally SMUI is used for the UI(popup).

## Requirements

You'll need to install: node.js, poetry and python

## Installation

```bash
poetry install
cd extension
npm install
npm run prepare
```

## scss

If you changed somthing in the .scss files in extension\src\theme or installed a new smui package, you have to run:

```bash
npm run prepare
```

## Building

```bash
npm run build
```