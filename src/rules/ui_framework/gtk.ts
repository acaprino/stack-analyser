import { register } from '../../register.js';

// The bindings of each language. PyGObject is not one: it binds every GObject library (GStreamer, GLib, Gio).
register({
  tech: 'gtk',
  name: 'GTK',
  type: 'ui_framework',
  dependencies: [
    { type: 'golang', name: 'github.com/diamondburned/gotk4/pkg' },
    { type: 'golang', name: 'github.com/gotk3/gotk3' },
    { type: 'maven', name: 'io.github.jwharm.javagi:gtk' },
    { type: 'maven', name: 'org.java-gi:gtk' },
    { type: 'nuget', name: 'GirCore.Gtk-4.0' },
    { type: 'nuget', name: 'GtkSharp' },
    { type: 'ruby', name: 'gtk3' },
    { type: 'ruby', name: 'gtk4' },
    { type: 'rust', name: 'gtk' },
    { type: 'rust', name: 'gtk4' },
  ],
});
