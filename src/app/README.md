# Application layer

`createApp.js` is the composition root. It may coordinate features, storage, and
services, but new screen markup belongs in `src/features/<feature>/` and reusable
markup belongs in `src/components/`.

When a new action grows beyond a small coordinator, move it to its owning feature
or client service and import the resulting function here.
