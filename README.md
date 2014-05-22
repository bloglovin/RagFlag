# RagFlag

Boolean flag manager with MongoDB (using Mongoose) persistence.

## About

_RagFlag_ let's you manage "flags". Flags are basically named collections of
booleans tied to a specific identifier.

## API

During application launch or similar you'll have to configure the available
flags with _RagFlag_ somehow. This is to make it easier to validate input and
such, mainly so that you don't write a typo or something.

```javascript
var connection = mongoose.createConnection();
var RagFlag = require('ragflag');
var flags = new RagFlag(connection);

// `user_state` in this case is a `namespace`, ie. a collection of flags.
// You can have how many you'd like and each collection can have any number of
// flags defined.
//
// In this example we are configuring flags that track our user's progress
// through an onboarding or similar. We might use this state to decide whether
// or not we want to show a tooltip or something.
flags.configure('user_state', [
  'has_seen_new_thing',
  'has_visited_special_page'
]);
```

Once you're all set up it's just a matter of reading and writing the flags.
Each collection can be associated with any number of identifiers. In the 
example above we might have one such `user_state` collection per user id.

Continuing on the the above example, a request comes in and we need to render
a page. Before we can render it we need to know whether or not we should
include the template for a special dialog that tells a first time user what
they are seeing.

```javascript
flags.get('user_state', user.id, function (err, collection) {
  if (!collection.check('has_visited_special_page')) {
    renderHelpDialog();
    collection.set('has_visited_special_page', true);
  }
});
```



