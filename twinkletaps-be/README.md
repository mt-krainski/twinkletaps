## Backend design

- Device: model representing an actual device.
  - A device has
    - an id
    - owner
    - associated API keys
  - Device can
    - be created
    - be sent a tap
    - retrieve a tap, acknowledge a tap
- Tap: array of data representing the tap
  - A tap has:
    - an id
    - the issuer
    - target device
  - A tap can:
    - be recorded
    - be retrieved and acknowledged

