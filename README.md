# jenkins-failed-test-comparator

```javascript
(() => {
  /*
  window.ftcConfig = {
    jiraUrl: 'https://my-jira-domain.com',
    hotKeys: {
      // Ctrl+Shift+X
      openMainModal: {
        key: 'X',
        ctrl: true,
        alt: false,
        shift: true,  
      },
    },
  };
  */
  
  const appUrl = 'https://raw.githubusercontent.com/korniychuk/jenkins-failed-test-comparator/master/dist/app.js';
  const script = document.createElement('script');
  script.src = appUrl + '?t=' + +new Date();
  document.head.appendChild(script);
})();
```
