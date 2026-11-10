********************************
Eendraadschema Community edition
********************************

## Purpose

Design and draw a one-wire diagram as enforced by the Belgian AREI legislation.
Source code written in Typescript, transpiled to Javascript and run in a browser.

## Build

Ensure you have vite installed, usually this is done using 
```npm install vite@latest```

Then run
```npm run dev```

Open the indicated url in a browser window.

A single file version can be built using
```npm run build```

This will create a single "`index.html`" file in the "`dist`"-folder
The "`index.html`"-file will still need all the resources in the root folder so must be renamed and
copied into the root-folder to get a working application.
The default build configuration is only provided as an example.

## Desktop app (offline)

The `desktop/` folder wraps the same build in an [Electron](https://www.electronjs.org/) app that works
without internet. The web app is served from inside the app through a private `app://` protocol, so
autosave, undo, linked windows and saving files behave exactly like in a browser.
Double-clicking a `.eds` file opens it in the app.

Run it locally:
```
npm ci && npm run build        # in the repository root
cd desktop
npm ci
npm start                      # start the app
npm run dist                   # build an installer for the current OS into desktop/release
```

Installers for Windows, Linux and macOS are built by the "Desktop app" GitHub workflow: run it manually
from the Actions tab, or push a tag such as `desktop-v1.0.0` to publish them as a GitHub release.
The installers are not code-signed, so Windows SmartScreen and macOS Gatekeeper will warn the first time.

## License

See LICENSE.md

## Frequent questions

### Do you have commercial plans?

No.

For me this is 100% a hobby-activity that I work on when and how I see fit.
It helps me to learn new skills and keep the brain cells activated.
I prefer to manage this project with as little constraints as possible. 

Any commercialisation would interfere with the freedom that I currently enjoy.
I therefore have no plans in that direction.

### Can I contribute?

Thanks for asking, but at present I manage this as a 1-person project and intend to keep
it that way for the foreseeable time.

The code is supplied as is for people that can use parts of it in other GPL projects.
An added benefit is that having the code out in the open provides people with a guarantee
that they will always be able to open and edit their EDS files, even if my own website
where I host this tool would go down for some reason.

I cannot state with 100% certainty that I will never change my mind and
accept contributions in the future, but don't start working on this code with that specific end-state in mind.
I hate to say no, but I most probably will.

### Have you considered a framework like Angular, React, ...

Yes, and one day that might actually happen, but that day is not today.
Some earlier experiments were not entirely convincing as far as performance is concerned
and have reduced my appetite.

In addition, given the small size of the project, the old-school javascript-approach is at present
not holding me back in any way.  If the project grows significantly larger, that assessment might change.
Having gone through some refactorings before in this and other projects, 
I am confident that I will be able to manage that problem when it presents itself.