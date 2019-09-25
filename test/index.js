console.assert(
  typeof require('../cjs').create({
    to: 'me@myself.&i',
    site: 'myself.&i',
    sender: 'My Static Site',
  }) === 'function',
  'expected module'
);