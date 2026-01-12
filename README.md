# quantum_circuit_builder_learning
Building a Bloch Sphere in react and nextjs with nice animations.

## Contributors

- Maxie Helen Bichmann
- Gabriel Ribeiro Fernandes

## Description

This repo is mainly used as an example how to use the QuantumBlochSphere component. It should showcase all features the component offers.

- ARCHITECTURE IDEA: The repo https://github.com/MaxieHelenBichmann/QuantumBlochSphere.git is only constructed as a package, that can be included in other projects like the WiQi.
The actual website to show the module is here in this repo, and includes the QuantumBlochSphere as a git submodule.

## Run / Build

### Prerequisites

- Node.js (recommended: LTS)
- pnpm

If you cloned the repo without fetching submodules:

```sh
git submodule update --init --recursive
```

### Install

```sh
pnpm install
```

### Run dev server

```sh
pnpm dev
```

Then open http://localhost:3000 (or the port printed in the terminal).

### Build production

```sh
pnpm build
```

### Run production

```sh
pnpm start
```
