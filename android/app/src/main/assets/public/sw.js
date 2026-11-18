/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "1ab86eac5888cf320447a97b83c98fb3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9b0d4af21d79de3eddb78d4e2a544e30"
  }, {
    "url": "pwa-192x192.png",
    "revision": "991e77dd3512dc8d703126ba8600b4b5"
  }, {
    "url": "index.html",
    "revision": "30f41e544ecd35c0a5b0c880fc8db64b"
  }, {
    "url": "icon.svg",
    "revision": "3f1d020abbf2b9b63aaca52190794ffa"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "704922f110ace8793b83ddf5d17fb041"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-CtUAgHbP.js",
    "revision": null
  }, {
    "url": "assets/index-0uuJUyhQ.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "704922f110ace8793b83ddf5d17fb041"
  }, {
    "url": "icon.svg",
    "revision": "3f1d020abbf2b9b63aaca52190794ffa"
  }, {
    "url": "pwa-192x192.png",
    "revision": "991e77dd3512dc8d703126ba8600b4b5"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9b0d4af21d79de3eddb78d4e2a544e30"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "1ab86eac5888cf320447a97b83c98fb3"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e35944d26cd78c48fad377351d3ff5ac"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
