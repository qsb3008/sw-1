'use strict';

// Licensed under a CC0 1.0 Universal (CC0 1.0) Public Domain Dedication
// http://creativecommons.org/publicdomain/zero/1.0/

(function() {

    // Update 'version' if you need to refresh the cache
    var staticCacheName = 'static';
    var version = 'v10::';

    // Store core files in a cache (including a page to display when off)
    // 首次进入的时候要缓存的列表
    function updateStaticCache() {
        return caches.open(version + staticCacheName)
            .then(function (cache) {
                return cache.addAll([
                    '/home.html',
                    '/index.js',
                    '/nba.js',
                    '/img/2.png',
                    '/img/tag.png'
                ]);
            });
    };

    self.addEventListener('install', function (event) {
        event.waitUntil(updateStaticCache());
    });

    self.addEventListener('activate', function(event) {
      event.waitUntil(
        // 获取所有 cache 名称
        caches.keys()
          .then(function(cacheNames) {
            return Promise.all(
              // 获取所有不同于当前版本名称 cache 下的内容
              cacheNames.filter(function(cacheName) {
                return cacheName != (version + staticCacheName);
              }).map(function(cacheName) {
                // 删除内容
                return caches.delete(cacheName);
              })
            ); // end Promise.all()
          }) // end caches.keys()
      ); // end event.waitUntil()
    });


    self.addEventListener('fetch', function (event) {
        var request = event.request;
        // Always fetch non-GET requests from the network
        if (request.method !== 'GET') {
            event.respondWith(
                fetch(request)
                    .catch(function () {
                        return caches.match('/offline.html');
                    })
            );
            return;
        }

        // For HTML requests, try the network first, fall back to the cache, finally the offline page
        if (request.headers.get('Accept').indexOf('text/html') !== -1) {
            // Fix for Chrome bug: https://code.google.com/p/chromium/issues/detail?id=573937
            if (request.mode != 'navigate') {
                request = new Request(request.url, {
                    method: 'GET',
                    headers: request.headers,
                    mode: request.mode,
                    credentials: request.credentials,
                    redirect: request.redirect
                });
            }
            event.respondWith(
                fetch(request)
                    .then(function (response) {
                        // Stash a copy of this page in the cache
                        // 拷贝一份以备后面做其他操作
                        var copy = response.clone();
                        // 访问新页面的时候把页面缓存到指定cache
                        caches.open(version + staticCacheName)
                            .then(function (cache) {
                                cache.put(request, copy);
                            });
                        return response;
                    })
                    .catch(function () {
                        return caches.match(request)
                            .then(function (response) {
                                return response || caches.match('/offline.html');
                            })
                    })
            );
            return;
        }

        // For non-HTML requests, look in the cache first, fall back to the network
        event.respondWith(
            caches.match(request)
                .then(function (response) {
                    return response || fetch(request)
                        .catch(function () {
                            // If the request is for an image, show an offline placeholder
                            if (request.headers.get('Accept').indexOf('image') !== -1) {
                                return new Response('<svg width="400" height="300" role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#9B9B9B" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-weight="bold"><tspan x="93" y="172">offline</tspan></text></g></svg>', { headers: { 'Content-Type': 'image/svg+xml' }});
                            }
                        });
                })
        );

    });

})();
