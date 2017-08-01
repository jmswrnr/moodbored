// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const moodbored = 'moodbored';
const {dialog} = require('electron').remote;

// requires
const sizeOf = require('image-size');
const fs = require('fs');

// directory variables
let rootDirectory = '';
let currentPath = rootDirectory;

// temporary element storage
let imageElements = [];

// container elements
let mainContainer = document.getElementById('main');
let leftSide = document.getElementById('left');
let rightSide = document.getElementById('right');
let folderView = document.getElementById('folders');
let imageView = document.getElementById('images');

// option/input elements
let optionsMenu = document.getElementById('options-menu');
let openFolderCtrl = document.getElementById('open-folder-ctrl');

let columnOption = {
  ctrl: document.getElementById('image-width-ctrl'),
  label: document.getElementById('image-width-label')
}

let gutterOption = {
  ctrl: document.getElementById('gutter-width-ctrl'),
  label: document.getElementById('gutter-width-label')
}

let backgroundOptionCtrl = document.getElementById('background-ctrl');
let userStylesCtrl = document.getElementById('user-styles-ctrl');;
let userStylesElem = document.getElementById('user-styles');
let hideSidePanelCtrl = document.getElementById('hide-side-panel-ctrl');
let hideOptionsCtrl = document.getElementById('options-ctrl');
let helpButton = document.getElementById('help-ctrl');
let infoButton = document.getElementById('info-ctrl');
let howToDialog = document.getElementById('how-to');
let infoDialog = document.getElementById('info');
let howToCloseCtrl = document.getElementById('how-to-close-ctrl');
let infoCloseCtrl = document.getElementById('info-close-ctrl');

// global options
let options = {
  columns: 3,
  gutter: 6,
  background: '#f1f2f3',
  userStyles: ''
};
let lastDirectory = currentPath;

// other elements
let title = document.getElementsByTagName('title')[0];

// this stores the directory structure for both
// caching access, and client-side access
let leaves = [];

// on load, run the init and the loadfiles functions
window.addEventListener('load', function () {
  InitialLoad();
});

function InitialLoad() {
  console.log('~~~~~~~~~ welcome to moodbored ~~~~~~~~~');
  LoadOptions();
  AddEventsToMainButtons();
  AddEventsToOptionsButtons();
  SetAllLinksExternal();
  SetVersionInfo();

  let loadedPath = localStorage.getItem('lastDirectory');
  rootDirectory = localStorage.getItem('rootDirectory');
  console.log('> root is ' + rootDirectory);

  if (rootDirectory == null || rootDirectory == '') {
    HowToDialogToggle();
  } else {
    GetNewDirectoryStructure(rootDirectory);
    CreateFolderView();

    if (loadedPath != null) {
      LoadDirectoryContents(loadedPath);
    } else if (rootDirectory != '') {
      LoadDirectoryContents(rootDirectory);
    }
  }
}


function AddEventsToMainButtons() {
  openFolderCtrl.addEventListener('click', function() {
    OpenNewRootFolder();
  });

  hideOptionsCtrl.addEventListener('click', function () {
    ToggleSection(optionsMenu);
  });

  hideSidePanelCtrl.addEventListener('click', function () {
    ToggleSection(leftSide);
    ToggleImageContainerSize();
  });
}

function AddEventsToOptionsButtons() {
  columnOption.label.innerText = options.columns;
  columnOption.ctrl.value = options.columns;
  columnOption.ctrl.addEventListener('input', function() {
    options.columns = columnOption.ctrl.value;
    columnOption.label.innerText = columnOption.ctrl.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    SaveOptions();
  });

  gutterOption.label.innerText = options.gutter;
  gutterOption.ctrl.value = options.gutter;
  gutterOption.ctrl.addEventListener('input', function() {
    options.gutter = gutterOption.ctrl.value;
    gutterOption.label.innerText = gutterOption.ctrl.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    SaveOptions();
  });

  backgroundOptionCtrl.value = options.background;
  mainContainer.style.backgroundColor = options.background;
  backgroundOptionCtrl.addEventListener('input', function() {
    options.background = backgroundOptionCtrl.value;
    mainContainer.style.backgroundColor = options.background;
    SaveOptions();
  });

  userStylesCtrl.value = options.userStyles;
  userStylesElem.innerText = options.userStyles;
  userStylesCtrl.addEventListener('input', function() {
    options.userStyles = userStylesCtrl.value;
    userStylesElem.innerText = options.userStyles;
    SaveOptions();
  });

  helpButton.addEventListener('click', function () {
    ToggleSection(howToDialog);
  });

  howToCloseCtrl.addEventListener('click', function () {
    ToggleSection(howToDialog);
  });

  infoButton.addEventListener('click', function () {
    ToggleSection(infoDialog);
  });

  infoCloseCtrl.addEventListener('click', function () {
    ToggleSection(infoDialog);
  });
}

function SetVersionInfo() {
  document.getElementById('version-disp').innerText = require('electron').remote.app.getVersion();
}

function OpenNewRootFolder() {
  dialog.showOpenDialog({properties: ["openDirectory"]}, (folder) => {
    if (folder === undefined) {
      console.log("no file selected");
      return;
    } else {
      console.log(folder);
      let _root = folder[0];
      GetNewDirectoryStructure(_root);
      LoadDirectoryContents(_root, true);
      CreateFolderView();
    }
  })
}

function LoadOptions() {
  _options = localStorage.getItem('options');
  if (_options != null) {
    options = JSON.parse(_options);
    console.log("successfully loaded options");
  } else {
    console.log("No options saved in local storage, going with defaults");
  }
}

function SaveOptions() {
  localStorage.setItem('options', JSON.stringify(options));
  console.log('saved options');
}

function SetAllLinksExternal() {
  const shell = require('electron').shell;
  let _links = document.getElementsByTagName('a');
  for (let link of _links) {
    console.log('add event for ' + link.href);
    link.addEventListener('click', function () {
      event.preventDefault();
      shell.openExternal(this.href);
    })
  }
}

// recursive function that gets the new directories.
// pushes all tail/endpoint directories into `leaves`
function GetNewDirectoryStructure(path) {
  let dir = fs.readdirSync(path);
  if (dir != undefined && dir.length > 0) {
    for (let i = 0; i < dir.length; i++) {
      let file = dir[i];
      let notLeaf = false;

      let stat = fs.lstatSync(path + '//' + file);
      if (!stat.isDirectory()) {
        if (i === dir.length - 1 && !notLeaf) {
          leaves.push(path);
          // console.log(leaves[leaves.length - 1]);
          // because it reached the end of the loop and there's no directories,
          // it must be full of images
          console.log(path + " is a leaf");
          // CreateFolderElement(path);
        }
      } else {
        let totalPath = path + '/' + file;
        // because there's a directory, it cannot be an end folder
        notLeaf = true;
        // starts the function again in the child directory it found
        GetNewDirectoryStructure(totalPath);
      }
    }
  }
}

function CreateFolderView() {
  ClearChildren(folderView);
  if (leaves.length > 1) {
    leaves.sort();
    for (let leaf of leaves) {
      CreateFolderElement(leaf);
    }
  }
}

function CreateFolderElement(totalPath) {
  let sp = document.createElement('button');
  let spTextContent = totalPath.replace(rootDirectory + "/", "");
  spTextContent = spTextContent.replace("/", " / ");
  let spText = document.createTextNode(spTextContent);
  sp.appendChild(spText);

  sp.addEventListener('click', function() {
    LoadDirectoryContents(totalPath);
  });

  folderView.appendChild(sp);
}

function LoadDirectoryContents(path, newRoot) {
  if (newRoot) {
    rootDirectory = path;
    localStorage.setItem('rootDirectory', rootDirectory);
    console.log('new root: ' + rootDirectory);
    leaves = [];
    GetNewDirectoryStructure(path);
  }

  console.log('loading ' + path);
  title.innerText = moodbored + " - " + path;

  if (path != currentPath) {
    currentPath = path;
    ClearChildren(imageView);
    imageElements = [];

    lastDirectory = currentPath;
    localStorage.setItem('lastDirectory', lastDirectory);
    LoadImages(currentPath);
  }

  function LoadImages(_path) {
    fs.readdir(_path, (err, dir) => {
      if (dir.length > 0) {
        for (let file of dir) {
          fs.lstat(_path + '//' + file, function (err, stats) {
            if (err) {
              return console.error(file + ': ' + err);
            }
            let imgFileTypes = /.(jpg|png|gif|jpeg|bmp|webp|svg)/;
            if (!stats.isDirectory() && file.match(imgFileTypes)) {
              CreateImage(_path, file);
            }
          })
        }
      }
    })
  }
}

function CreateImage(path, file) {
  let img = document.createElement('img');
  let src = path + '/' + file;
  let dim = sizeOf(src);
  img.src = src;
  img.height = dim.height;
  img.width = dim.width;
  ResizeImage(img);
  imageView.appendChild(img);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
  imageElements.push(img);
}

// ~~~~~~~~~ utility functions ~~~~~~~~~

function ResizeImages() {
  for (let img of imageElements) {
    ResizeImage(img);
  }
}

function ToggleSection(section) {
  section.classList.toggle('hidden');
}

function ToggleImageContainerSize() {
  rightSide.classList.toggle('expand');
}

function ResizeImage(img) {
  img.style.width = "calc(100% / " + options.columns + " - " + (options.gutter * 2) + "px)";
  img.style.margin = options.gutter + "px";
}

function ClearChildren(parent) {
  console.log('clearing all children elements of ' + parent.id);
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
  console.log('done clearing elements of ' + parent.id);
}



