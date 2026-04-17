/**
 * In-browser TSX compilation runtime using Sucrase.
 *
 * Fetches raw TSX from the file API, rewrites import statements to use
 * a pre-registered module map, transforms JSX/TS with Sucrase, and
 * returns a React component via dynamic import of a blob URL.
 *
 * Module registry: React, ReactDOM, and all Radix UI packages already
 * in the Katagami UI's package.json.
 */

import { transform } from "sucrase";
import React from "react";
import * as ReactDOM from "react-dom";

// Radix UI imports — all packages from package.json
import * as Accordion from "@radix-ui/react-accordion";
import * as Avatar from "@radix-ui/react-avatar";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as HoverCard from "@radix-ui/react-hover-card";
import * as Icons from "@radix-ui/react-icons";
import * as Label from "@radix-ui/react-label";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Progress from "@radix-ui/react-progress";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import * as Toast from "@radix-ui/react-toast";
import * as Toggle from "@radix-ui/react-toggle";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Tooltip from "@radix-ui/react-tooltip";

const MODULE_REGISTRY: Record<string, unknown> = {
  react: React,
  "react-dom": ReactDOM,
  "@radix-ui/react-accordion": Accordion,
  "@radix-ui/react-avatar": Avatar,
  "@radix-ui/react-checkbox": Checkbox,
  "@radix-ui/react-dialog": Dialog,
  "@radix-ui/react-dropdown-menu": DropdownMenu,
  "@radix-ui/react-hover-card": HoverCard,
  "@radix-ui/react-icons": Icons,
  "@radix-ui/react-label": Label,
  "@radix-ui/react-navigation-menu": NavigationMenu,
  "@radix-ui/react-popover": Popover,
  "@radix-ui/react-progress": Progress,
  "@radix-ui/react-radio-group": RadioGroup,
  "@radix-ui/react-scroll-area": ScrollArea,
  "@radix-ui/react-select": Select,
  "@radix-ui/react-separator": Separator,
  "@radix-ui/react-slider": Slider,
  "@radix-ui/react-switch": Switch,
  "@radix-ui/react-tabs": Tabs,
  "@radix-ui/react-toast": Toast,
  "@radix-ui/react-toggle": Toggle,
  "@radix-ui/react-toggle-group": ToggleGroup,
  "@radix-ui/react-tooltip": Tooltip,
};

// Cache compiled components by fileId
const componentCache = new Map<string, React.ComponentType>();

/**
 * Rewrite `import` statements to use the module registry.
 *
 * Handles:
 *   import React from "react"
 *   import { useState } from "react"
 *   import * as Tabs from "@radix-ui/react-tabs"
 *   import Foo, { Bar } from "module"
 */
function rewriteImports(code: string): string {
  // Match import statements — multiline-safe
  return code.replace(
    /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g,
    (_match, specifiers: string, moduleId: string) => {
      const varName = `__mod_${moduleId.replace(/[^a-zA-Z0-9]/g, "_")}__`;
      const requireLine = `const ${varName} = __KATAGAMI_REQUIRE__("${moduleId}");`;

      const trimmed = specifiers.trim();

      // import * as X from "mod"
      if (trimmed.startsWith("*")) {
        const alias = trimmed.replace(/^\*\s*as\s+/, "").trim();
        return `${requireLine}\nconst ${alias} = ${varName};`;
      }

      // import { X, Y as Z } from "mod"
      if (trimmed.startsWith("{")) {
        const destructure = trimmed;
        return `${requireLine}\nconst ${destructure} = ${varName};`;
      }

      // import Default from "mod"
      // import Default, { Named } from "mod"
      const commaIdx = trimmed.indexOf(",");
      if (commaIdx === -1) {
        // Simple default import
        return `${requireLine}\nconst ${trimmed} = ${varName}.default || ${varName};`;
      }

      // Default + named
      const defaultName = trimmed.slice(0, commaIdx).trim();
      const rest = trimmed.slice(commaIdx + 1).trim();
      return `${requireLine}\nconst ${defaultName} = ${varName}.default || ${varName};\nconst ${rest} = ${varName};`;
    },
  );
}

/**
 * Compile raw TSX source into a React component.
 */
export async function compileTsx(
  fileId: string,
  tsxSource: string,
): Promise<React.ComponentType> {
  const cached = componentCache.get(fileId);
  if (cached) return cached;

  // Step 1: Rewrite imports
  let code = rewriteImports(tsxSource);

  // Step 2: Transform JSX + TypeScript with Sucrase
  const result = transform(code, {
    transforms: ["typescript", "jsx"],
    jsxRuntime: "classic",
    production: true,
  });
  code = result.code;

  // Step 3: Wrap in a module that provides the require function and exports
  const wrappedCode = `
(function(__KATAGAMI_REQUIRE__, React) {
  const exports = {};
  const module = { exports };
  ${code}
  // Support: export default function/class, or module.exports
  return module.exports.default || module.exports || exports.default || exports;
})
`;

  // Step 4: Evaluate using Function constructor (safer than eval, same CSP requirements)
  // eslint-disable-next-line no-new-func
  const factory = new Function("return " + wrappedCode)();
  const requireFn = (moduleId: string) => {
    const mod = MODULE_REGISTRY[moduleId];
    if (!mod) {
      console.warn(
        `[tsx-runtime] Unknown module "${moduleId}", returning empty object`,
      );
      return {};
    }
    return mod;
  };

  const Component = factory(requireFn, React);

  if (typeof Component === "function") {
    componentCache.set(fileId, Component);
    return Component;
  }

  throw new Error(
    `TSX compilation produced a ${typeof Component}, expected a function component`,
  );
}

/**
 * Fetch TSX source from the file API and compile it.
 */
export async function fetchAndCompileTsx(
  fileId: string,
): Promise<React.ComponentType> {
  const cached = componentCache.get(fileId);
  if (cached) return cached;

  const resp = await fetch(`/api/file/${encodeURIComponent(fileId)}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch TSX file ${fileId}: ${resp.status}`);
  }
  const source = await resp.text();
  return compileTsx(fileId, source);
}

/**
 * Clear the component cache (useful for dev/hot-reload scenarios).
 */
export function clearTsxCache(fileId?: string): void {
  if (fileId) {
    componentCache.delete(fileId);
  } else {
    componentCache.clear();
  }
}
