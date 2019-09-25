# A Zeit Now AWS SES Based Serverless Utility

Usable as path for [static.email](https://github.com/WebReflection/static.email#readme) client side utility.

```js
const {create} = require('static.email.ses');

module.exports = create({
  // email details
  to,               // the validated email address target
  site,             // the domain sending emails
  sender,           // the name used for the "from" email address

  // AWS SES details
  region,           // the AWS SES region
  accessKeyId,      // the AWS IAM access key id
  secretAccessKey,  // the AWS IAM secret access key

  // check esm/index.js to know more about extra optional details
});
```