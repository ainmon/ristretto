<div align="center">

# ☕ Ristretto

### A concentrated, full-bodied checkup for your Svelte codebase.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%23007ACC.svg)](http://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/s-Svelte-%23ff3e00.svg)](https://svelte.dev)

</div>

---

**Ristretto** is a static analysis tool (linter) designed specifically for **Svelte** and **SvelteKit** applications.

While `svelte-check` handles your types and `ESLint` handles your syntax, **Ristretto** acts as your personal barista, tasting your code for logical "burnt notes" (anti-patterns), memory leaks, and performance bottlenecks that other tools miss.

## ☕ Ristretto vs. Svelte Check

**Ristretto is not a replacement for `svelte-check`.** They work best together.

| Feature           | `svelte-check`                                        | `ristretto`                                        |
| :---------------- | :---------------------------------------------------- | :------------------------------------------------- |
| **Primary Focus** | **Type Safety** & Syntax                              | **Runtime Logic** & Performance                    |
| **Catches**       | Type errors, invalid props, syntax errors             | Memory leaks, unoptimized reactivity, console logs |
| **Analogy**       | The Health Inspector (Is it safe?)                    | The Head Barista (Is it _good_?)                   |
| **Example Catch** | `Error: Property 'uid' does not exist on type 'User'` | `Error: .subscribe() used without unsubscribe()`   |

**Use `svelte-check`** to ensure your code compiles and has correct types.
**Use `ristretto`** to ensure your app is performant, leak-free, and follows best practices.

## 🚀 Quick Start (Order Up!)

You don't need to install anything to get a taste. Run the scanner directly in your project folder:

```bash
npx ristretto
```
