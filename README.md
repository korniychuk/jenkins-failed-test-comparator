# jenkins-failed-test-comparator

```javascript
(() => {
  const script = document.createElement('script');
  script.src = 'http://localhost:8090/app.js?t=' + +new Date();
  document.head.appendChild(script);
})();
```

```javascript
(() => {
  /*
  window.ftcConfig = {
    hotKeys: {
      openMainModal: {
        key: 'X',
        ctrl: true,
        alt: false,
        shift: true,  
      },
    },
  };
  */
  
  const script = document.createElement('script');
  script.src = 'http://localhost:8090/app.js?t=' + +new Date();
  document.head.appendChild(script);
})();
```
