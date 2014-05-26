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

### `new RagFlag(connection, flags)`

`connection` should be a [mongoose](http://mongoosejs.com) connection object.
`flags` is optional and should be an object with keys representing namespaces
and values repsenting their valid flags. See `configure()` below.

### `RagFlag.configure(namespace, flags)`

Configure a _namespace_ with the given _flags_. `flags` should be an array of
strings.

`namespace` can also be an object where the keys are the names of the
namespaces and the values are an array of flags.

### `RagFlag.get(name, id, fn)`

Fetches the flags for a given `id` in the given `namespace`. The `Flags` object
will be passed to the `fn` as the second argument. First argument is any error
that occured.

---

`Flags` is the object fetched by `RagFlag.get()`.

### `Flags.set(flag, on, fn)`

Sets the `flag` to the vaue `on`. `flag` must be a valid flag for the current
namespace. `on` must be a boolean.

`fn` is optional and called once the update has been persisted in MongoDB. The
change will be persisted even if you don't supply a callback.

### `Flags.check(flag)`

Returns a boolean telling you whether or not `flag` is true for the current
namespace.

### `Flags.refresh(fn)`

If you think the flags might've been updated from elsewhere in your application
you can use _refresh_ to update the state of the current `Flags` object to
match what's in your database.

## Events

### RagFlag

The following events are emitted by `RagFlag`:

* **saved**, emitted whenever a Flag is saved. Passes a plain JavaScript object
representation of the saved flag to the listeners.
* **error**, emitted whenever an error saving a `Flags` object occurs.

### Flags

The following events are emitted by `Flag` objects:

* **changed**, whenever `set` is called on a particular `Flags` object.
* **refreshed**, emitted when on a `Flags` object if it's refreshed.

## License

Distributed under the MIT license.

