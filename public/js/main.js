var main = new function() {
  var self = this;

  this.STATUS_CONNECTED = 1;
  this.STATUS_DISCONNECTED = 2;

  this.connectionMode = 'ble';
  this.bleAvailable = true;

  this.firmwareFiles = {};
  this.firmwarePreloaded = false;

  this.settings;

  this.deviceWifiSettings = {
    ssid: '',
    wifiPassword: '',
    host: 'mqtt.a9i.sg',
    port: '1883',
    username: '',
    mqttPassword: ''
  };

  // Run on page load
  this.init = async function() {
    let connectionMode = readGET('connectionMode');
    if (connectionMode == null) {
      connectionMode = localStorage.getItem('connectionMode');
    }
    if (connectionMode != null) {
      self.connectionMode = connectionMode;
    }

    let deviceWifiSettings = localStorage.getItem('deviceWifiSettings');
    if (deviceWifiSettings) {
      self.deviceWifiSettings = JSON.parse(deviceWifiSettings);
    }

    let settings = localStorage.getItem('iotySettings');
    if (settings) {
      self.settings = JSON.parse(settings);
      extensions.processExtensions();
    } else {
      self.settings = self.defaultSettings();
    }

    if (typeof navigator.bluetooth == 'undefined') {
      self.bleAvailable = false;
      self.connectionMode = 'mqtt';
    }

    self.$navs = $('nav li');
    self.$panels = $('.panels .panel');
    self.$fileMenu = $('.fileMenu');
    self.$appMenu = $('.appMenu');
    self.$helpMenu = $('.helpMenu');
    self.$languageMenu = $('.language');
    self.$newsButton = $('.news');
    self.$connectStatus = $('#connectionStatus')
    self.$connectMenu = $('#connectMenu');

    self.$projectName = $('#projectName');

    self.updateTextLanguage();

    self.$navs.click(self.tabClicked);
    self.$fileMenu.click(self.toggleFileMenu);
    self.$appMenu.click(self.toggleAppMenu);
    self.$helpMenu.click(self.toggleHelpMenu);
    self.$languageMenu.click(self.toggleLanguageMenu);
    self.$newsButton.click(self.showNews);
    self.$connectMenu.click(self.toggleConnectMenu);

    window.addEventListener('beforeunload', self.checkUnsaved);
    blocklyPanel.onActive();
    self.loadProjectName();

    let $firmwareWindow = self.hiddenButtonDialog('Firmware Download', 'Preloading Firmware...');
    self.preloadFirmwareFiles();
    $firmwareWindow.close();

    self.showWhatsNew();

    setInterval(self.saveSettingsToLocalStorage, 2 * 1000);
  };

  this.defaultSettings = function() {
    return {
      extensions: [],
    }
  };

  this.saveSettingsToLocalStorage = function() {
    localStorage.setItem('iotySettings', JSON.stringify(self.settings));
  };

  this.hiddenButtonDialog = function(title, body) {
    let $dialog = acknowledgeDialog({
      title: title,
      message: body
    });
    $dialog.$buttonsRow.addClass('hide');

    return $dialog;
  };


  this.preloadFirmwareFiles = async function() {
    async function retrieveUpdateFile() {
      let response = await fetch('firmware/' + constants.FIRMWARE_UPDATE_FILE);
      let text = await response.text();

      self.firmwareFiles[constants.FIRMWARE_UPDATE_FILE] = {
        content: text,
        tempName: constants.FIRMWARE_UPDATE_FILE
      }

      for (let row of text.split('\n')) {
        let command = row.split(' ');
        if (command[0] == 'mv') {
          self.firmwareFiles[command[2]] = {
            content: '',
            tempName: command[1]
          }
        }
      }
    }

    async function retrieveFiles() {
      for (let file in self.firmwareFiles) {
        let response = await fetch('firmware/' + file);
        let text = await response.text();
        self.firmwareFiles[file].content = text;
      }
    }

    await retrieveUpdateFile();
    await retrieveFiles();
    self.firmwarePreloaded = true;
  };

  // Update text already in html
  this.updateTextLanguage = function() {
    $('#navBlocks').text(i18n.get('#main-blocks#'));
    $('#navSim').text(i18n.get('#main-sim#'));
    self.$fileMenu.text(i18n.get('#main-file#'));
    self.$helpMenu.text(i18n.get('#main-help#'));
  };

  // Toggle language menu
  this.toggleLanguageMenu = function(e) {
    if ($('.languageMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      function setLang(lang) {
        localStorage.setItem('LANG', lang);
        window.location.reload();
      }

      let menuItems = [
        {html: 'Deutsch', line: false, callback: function() { setLang('de'); }},
        {html: 'Ελληνικά', line: false, callback: function() { setLang('el'); }},
        {html: 'English', line: false, callback: function() { setLang('en'); }},
        {html: 'Español', line: false, callback: function() { setLang('es'); }},
        {html: 'Français', line: false, callback: function() { setLang('fr'); }},
        {html: 'עברית', line: false, callback: function() { setLang('he'); }},
        {html: 'Nederlands', line: false, callback: function() { setLang('nl'); }},
        {html: 'Português', line: false, callback: function() { setLang('pt'); }},
        {html: 'tlhIngan', line: false, callback: function() { setLang('tlh'); }},
        {html: 'Русский', line: false, callback: function() { setLang('ru'); }},
        {html: 'Magyar', line: false, callback: function() { setLang('hu'); }},
      ];

      menuDropDown(self.$languageMenu, menuItems, {className: 'languageMenuDropDown', align: 'right'});
    }
  };

  // About page
  this.openAbout = function() {
    let $body = $(
      '<div class="about">' +
        '<div></div>' +
        '<h3>Credits</h3>' +
        '<p>Created by Cort @ <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<p>This software would not have been possible without the great people behind:</p>' +
        '<ul>' +
          '<li><a href="https://developers.google.com/blockly" target="_blank">Blockly</a></li>' +
          '<li><a href="https://ace.c9.io/" target="_blank">Ace Editor</a></li>' +
          '<li><a href="https://skulpt.org/" target="_blank">Skulpt</a></li>' +
          '<li><a href="https://micropython.org/" target="_blank">Micropython</a></li>' +
        '</ul>' +
        '<h3>Contact</h3>' +
        '<p>Please direct all complaints or requests to <a href="mailto:cort@aposteriori.com.sg">Cort</a>.</p>' +
        '<p>If you\'re in the market for STEM training, do consider <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<h3>License</h3>' +
        '<p>GNU General Public License v3.0</p>' +
        '<p>IoTy is a Free and Open Source Software</p>' +
      '</div>'
    );

    let $buttons = $(
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog('About', $body, $buttons);

    $buttons.click(function(){
      $dialog.close();
    });
  };

  // Open page in new tab
  this.openPage = function(url) {
    window.open(url, '_blank');
  };

  // Toggle app
  this.toggleAppMenu = function(e) {
    if ($('.appMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'MQTT App Builder', line: false, callback: self.appBuilderWindow},
        {html: 'Access Point Page', line: false, callback: self.apPageWindow},
      ];

      menuDropDown(self.$appMenu, menuItems, {className: 'appMenuDropDown'});
    }
  };

  this.appBuilderWindow = function() {
    let options = {
      title: i18n.get('#main-appBuilder_title#'),
      message: i18n.get('#main-appBuilder_description#'),
      confirm: i18n.get('#main-appBuilder_go#')
    };
    confirmDialog(options, function(){
      self.openPage('https://quirkycort.github.io/IoTy-MQTT-Client/public');
    });
  };

  this.apPageWindow = function() {
    let options = {
      title: i18n.get('#main-apPage_title#'),
      message: i18n.get('#main-apPage_description#'),
      confirm: i18n.get('#main-apPage_go#')
    };
    confirmDialog(options, function(){
      self.openPage('http://192.168.4.1');
    });
  };

  // Toggle help
  this.toggleHelpMenu = function(e) {
    if ($('.helpMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        // {html: 'Wiki', line: false, callback: function() { self.openPage('https://github.com/QuirkyCort/gears/wiki'); }},
        {html: 'Github', line: false, callback: function() { self.openPage('https://github.com/QuirkyCort/IoTy'); }},
        {html: i18n.get('#main-whats_new#'), line: false, callback: function() { self.showWhatsNew(true); }},
        {html: i18n.get('#main-privacy#'), line: false, callback: function() { self.openPage('privacy.html'); }},
        {html: i18n.get('#main-about#'), line: true, callback: self.openAbout },
      ];

      menuDropDown(self.$helpMenu, menuItems, {className: 'helpMenuDropDown'});
    }
  };

  // Toggle connect
  this.toggleConnectMenu = function(e) {
    if ($('.connectMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      if (self.connectionMode == 'ble') {
        self.bleConnectMenu(e);
      } else if (self.connectionMode == 'mqtt') {
        self.mqttConnectMenu(e);
      }
    }
  };

  this.bleConnectMenu = function(e) {
    let menuItems = [
      {html: i18n.get('#main-connectMode#'), line: false, callback: self.connectModeMenu },
      {html: i18n.get('#main-connectBLE#'), line: false, callback: ble.connect },
      {html: i18n.get('#main-download#'), line: false, callback: ble.download },
      {html: i18n.get('#main-erase#'), line: false, callback: ble.eraseDialog },
      {html: i18n.get('#main-changeName#'), line: false, callback: ble.changeNameDialog},
      {html: i18n.get('#main-updateFirmware#'), line: false, callback: ble.updateFirmwareDialog},
      {html: i18n.get('#main-getInfo#'), line: false, callback: ble.getInfo},
      {html: i18n.get('#main-configureDeviceNetwork#'), line: false, callback: main.configureDeviceNetwork},
      {html: i18n.get('#main-disconnect#'), line: false, callback: ble.disconnect},
    ];

    menuDropDown(self.$connectMenu, menuItems, {className: 'connectMenuDropDown', align: 'right'});
  };

  this.mqttConnectMenu = function(e) {
    let menuItems = [
      {html: i18n.get('#main-connectMode#'), line: false, callback: self.connectModeMenu },
      {html: i18n.get('#main-connectInet#'), line: false, callback: mqtt.connectDialog },
      {html: i18n.get('#main-download#'), line: false, callback: mqtt.download },
      {html: i18n.get('#main-erase#'), line: false, callback: mqtt.eraseDialog },
      {html: i18n.get('#main-changeName#'), line: false, callback: mqtt.changeNameDialog},
      {html: i18n.get('#main-updateFirmware#'), line: false, callback: mqtt.updateFirmwareDialog},
      {html: i18n.get('#main-getInfo#'), line: false, callback: mqtt.getInfo},
      {html: i18n.get('#main-configureDeviceNetwork#'), line: false, callback: main.configureDeviceNetwork},
      {html: i18n.get('#main-disconnect#'), line: false, callback: mqtt.disconnect},
    ];

    menuDropDown(self.$connectMenu, menuItems, {className: 'connectMenuDropDown', align: 'right'});
  };

  this.configureDeviceNetwork = function(e) {
    let $body = $(
      '<div>' +
        'Configure WiFi access and MQTT connection for your IoTy device.' +
      '</div>' +
      '<div>' +
        'These credentials are only used for programming your IoTy device, ' +
        'they are not used for your IoT programs and can be different from the credentials used there.' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">WiFi SSID</div>' +
        '<div class="text"><input type="text" class="ssid"></div>' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">WiFi Password</div>' +
        '<div class="text"><input type="text" class="wifiPassword"></div>' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">MQTT Host</div>' +
        '<div class="text"><input type="text" class="host"></div>' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">MQTT Port</div>' +
        '<div class="text"><input type="text" class="port"></div>' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">Username</div>' +
        '<div class="text"><input type="text" class="username"></div>' +
      '</div>' +
      '<div class="configuration">' +
        '<div class="configurationTitle">Password</div>' +
        '<div class="text"><input type="text" class="mqttPassword"></div>' +
      '</div>'
    );

    let $ssid = $body.find('.ssid');
    let $wifiPassword = $body.find('.wifiPassword');
    let $host = $body.find('.host');
    let $port = $body.find('.port');
    let $username = $body.find('.username');
    let $mqttPassword = $body.find('.mqttPassword');

    $ssid.val(self.deviceWifiSettings.ssid);
    $wifiPassword.val(self.deviceWifiSettings.wifiPassword);
    $host.val(self.deviceWifiSettings.host);
    $port.val(self.deviceWifiSettings.port);
    $username.val(self.deviceWifiSettings.username);
    $mqttPassword.val(self.deviceWifiSettings.mqttPassword);

    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancel</button>' +
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog('Connect', $body, $buttons);

    $buttons.siblings('.cancel').click(function(){
      $dialog.close();
    });
    $buttons.siblings('.confirm').click(function(){
      self.deviceWifiSettings = {
        ssid: $ssid.val().trim(),
        wifiPassword: $wifiPassword.val().trim(),
        host: $host.val().trim(),
        port: $port.val().trim(),
        username: $username.val().trim(),
        mqttPassword: $mqttPassword.val().trim()
      };
      localStorage.setItem('deviceWifiSettings', JSON.stringify(self.deviceWifiSettings));

      let file = '';
      file += self.deviceWifiSettings.ssid + '\n';
      file += self.deviceWifiSettings.wifiPassword + '\n';
      file += self.deviceWifiSettings.host + '\n';
      file += self.deviceWifiSettings.port + '\n';
      file += self.deviceWifiSettings.username + '\n';
      file += self.deviceWifiSettings.mqttPassword + '\n';

      if (self.connectionMode == 'ble') {
        ble.configureDeviceNetwork(file);
      } else if (self.connectionMode == 'mqtt') {
        mqtt.configureDeviceNetwork(file);
      }

      $dialog.close();
    });
  };

  this.checkPythonSyntax = function() {
    Sk.configure({
      __future__: Sk.python3
    });
    let syntaxError = false;
    let errorText = '';
    for (let filename in filesManager.files) {
      try {
        Sk.compile(filesManager.files[filename], filename);
      } catch (error) {
        console.log(error);
        errorText += 'File "' + error.traceback[0].filename + '", line ' + error.traceback[0].lineno + '\n';
        errorText += '  ' + error.args.v[0].v + '\n';
        syntaxError = true;
      }
    }

    return {
      error: syntaxError,
      text: errorText
    };
  }

  this.connectModeMenu = function() {
    let $body = $(
      '<div>' +
        '<select></select>' +
        '<div class="description"></div>' +
      '</div>'
    );
    let $select = $body.find('select');
    $select.append('<option value="ble">Bluetooth</option>');
    $select.append('<option value="mqtt">Internet</option>');

    $select.val(self.connectionMode);

    let $description = $body.find('.description');
    $select.change(setDescription);

    function setDescription() {
      if ($select.val() == 'ble') {
        $description.html(
          '<p>' +
            'Bluetooth mode only works with Chrome and Chrome based browsers, and is not available on iOS. ' +
          '</p>' +
          '<p>' +
            'Your computer will need to have Bluetooth hardware compatible with the IoTy device.' +
          '</p>' +
          '<p>' +
            'Web Bluetooth is an experimental technology and you may encounter compatibility problems. ' +
            'If so, please try a different connection mode.' +
          '</p>'
        );
      } else if ($select.val() == 'mqtt') {
        $description.html(
          '<p>' +
            'In Internet mode, the IoTy device connects to an MQTT broker via the internet and receives programs through the broker. ' +
          '</p>' +
          '<p>' +
            'To use Internet mode, you must first use a different mode to configure the IoTy device network, providing it with the credentials required to connect to your router and the MQTT broker. ' +
          '</p>' +
          '<p>' +
            'This mode should be compatible with all browsers on any OS.' +
          '</p>'
        );
      }
    }

    setDescription();
    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancel</button>' +
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog('Connection Mode', $body, $buttons);

    $buttons.siblings('.cancel').click(function(){
      $dialog.close();
    });
    $buttons.siblings('.confirm').click(function(){
      self.connectionMode = $select.val();
      localStorage.setItem('connectionMode', self.connectionMode);
      self.disconnectUnusedMode();
      $dialog.close();
    });
  };

  this.disconnectUnusedMode = function() {
    if (self.connectionMode != 'ble') {
      ble.disconnect();
    }
    main.setConnectStatus(main.STATUS_DISCONNECTED);
  };

  // Toggle filemenu
  this.toggleFileMenu = function(e) {
    if ($('.fileMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: i18n.get('#main-new_program#'), line: true, callback: self.newProgram},
        {html: i18n.get('#main-load_blocks#'), line: false, callback: self.loadFromComputer},
        {html: i18n.get('#main-save_blocks#'), line: true, callback: self.saveToComputer},
        {html: i18n.get('#main-load_python#'), line: false, callback: self.loadPythonFromComputer},
        {html: i18n.get('#main-save_python#'), line: true, callback: self.savePythonToComputer},
        {html: i18n.get('#main-save_json#'), line: false, callback: self.saveToJson},
        {html: i18n.get('#main-save_firmware#'), line: true, callback: self.saveFirmwareToJson},
        {html: i18n.get('#main-load_extension#'), line: true, callback: extensions.loadDialog},
      ];

      menuDropDown(self.$fileMenu, menuItems, {className: 'fileMenuDropDown'});
    }
  };

  // Set connect status
  this.setConnectStatus = function(status) {
    if (status == self.STATUS_CONNECTED) {
      self.$connectStatus.text('Connected');
      self.$connectStatus.addClass('connected');
    } else if (status == self.STATUS_DISCONNECTED) {
      self.$connectStatus.text('Disconnected');
      self.$connectStatus.removeClass('connected');
    }
  };

  // New program
  this.newProgram = function() {
    confirmDialog(i18n.get('#main-start_new_warning#'), function() {
      blockly.loadDefaultWorkspace();
      pythonPanel.modified = false;
      localStorage.setItem('pythonModified', false);
      blocklyPanel.setDisable(false);
      self.$projectName.val('');
      self.saveProjectName();
      self.settings = self.defaultSettings();
    });
  };

  // Load project name from local storage
  this.loadProjectName = function() {
    self.$projectName.val(localStorage.getItem('projectName'));
  };

  // Remove problematic characters then save project name
  this.saveProjectName = function() {
    let filtered = self.$projectName.val().replace(/[^0-9a-zA-Z_\- ]/g, '').trim();
    self.$projectName.val(filtered);
    localStorage.setItem('projectName', filtered);
  };

  // save to computer
  this.saveToComputer = function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'IoTy';
    }

    var zip = new JSZip();
    zip.file('blocks.json', blockly.getJsonText());
    zip.file('settings.json', JSON.stringify(self.settings));

    zip.generateAsync({
      type:'base64',
      compression: "DEFLATE"
    })
    .then(function(content) {
      var hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:application/zip;base64,' + content;
      hiddenElement.target = '_blank';
      hiddenElement.download = filename + '.zip';
      hiddenElement.dispatchEvent(new MouseEvent('click'));
    });
  };

  // load from computer
  this.loadFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/zip,.zip,application/xml,.xml';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      if (e.target.files[0].name.slice(-4) == '.zip') {
        self.loadFromComputerZip(e.target.files[0]);
      } else {
        self.loadFromComputerXml(e.target.files[0]);
      }
    });
  };

  // load new zip format from computer
  this.loadFromComputerZip = function(file) {
    async function loadFiles(zip) {
      await zip.file('blocks.json').async('string')
        .then(function(content){
          blockly.loadJsonText(content);
        });

      await zip.file('settings.json').async('string')
        .then(function(content){
          self.settings = JSON.parse(content);
        });
    }

    JSZip.loadAsync(file)
      .then(loadFiles);

    let filename = file.name.replace(/.zip/, '');
    self.$projectName.val(filename);
    self.saveProjectName();
  };

  // load old xml format from computer
  this.loadFromComputerXml = function(file) {
    var reader = new FileReader();
    reader.onload = function() {
      blockly.loadXmlText(this.result);
    };
    reader.readAsText(file);
    let filename = file.name.replace(/.xml/, '');
    self.$projectName.val(filename);
    self.saveProjectName();
  };

  // save to computer
  this.savePythonToComputer = function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'IoTy';
    }

    if (filesManager.modified == false) {
      pythonPanel.loadPythonFromBlockly();
    }
    filesManager.updateCurrentFile();

    var zip = new JSZip();

    for (let f in filesManager.files) {
      zip.file(f, filesManager.files[f]);
    }

    zip.generateAsync({type:'base64'})
    .then(function(content) {
      var hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:application/xml;base64,' + content;
      hiddenElement.target = '_blank';
      hiddenElement.download = filename + '.zip';
      hiddenElement.dispatchEvent(new MouseEvent('click'));
    });
  };

  // load from computer
  this.loadPythonFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/zip,.zip';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      async function loadFiles(zip) {
        filesManager.deleteAll();

        let filenames = [];
        zip.forEach(function(path, file) {
          filenames.push(path);
        });

        for (let filename of filenames) {
          await zip.file(filename).async('string')
            .then(function(content){
              filesManager.add(filename, content);
            });
        }

        filesManager.modified = true;
        filesManager.unsaved = true;
        filesManager.saveLocalStorage();
        self.tabClicked('navPython');
      }

      JSZip.loadAsync(e.target.files[0])
        .then(loadFiles);
    });
  };

  // save to json package
  this.saveToJson = function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'IoTy';
    }

    if (filesManager.modified == false) {
      pythonPanel.loadPythonFromBlockly();
    }
    filesManager.updateCurrentFile();

    let obj = {};

    for (let f in filesManager.files) {
      obj[f] = filesManager.files[f];
    }

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:application/xml;base64,' + btoa(JSON.stringify(obj));
    hiddenElement.target = '_blank';
    hiddenElement.download = filename + '.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  };

  // save to json package
  this.saveFirmwareToJson = function() {
    let filename = 'firmware-v' + constants.CURRENT_VERSION;

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:application/xml;base64,' + btoa(JSON.stringify(self.firmwareFiles));
    hiddenElement.target = '_blank';
    hiddenElement.download = filename + '.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  };

  // Check for unsaved changes
  this.checkUnsaved = function (event) {
    if (blockly.unsaved || filesManager.unsaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  // Clicked on tab
  this.tabClicked = function(tabNav) {
    if (typeof tabNav == 'string') {
      var match = tabNav;
    } else {
      var match = $(this)[0].id;
    }

    function getPanelByNav(nav) {
      // the python module panels are all in the dict, look there first
      if (nav == 'navBlocks') {
        return blocklyPanel;
      } else if (nav == 'navPython') {
        return pythonPanel;
      } else if (nav == 'navMonitor') {
        return monitorPanel;
      }
    };

    // when deleting a python module, inActiveNav and inActive will be undefined
    inActiveNav = self.$navs.siblings('.active').attr('id');
    inActive = getPanelByNav(inActiveNav);
    active = getPanelByNav(match);

    self.$navs.removeClass('active');
    $('#' + match).addClass('active');

    self.$panels.removeClass('active');
    self.$panels.siblings('[aria-labelledby="' + match + '"]').addClass('active');

    if ((inActive !== undefined) && (typeof inActive.onInActive == 'function')) {
      inActive.onInActive();
    }
    if (typeof active.onActive == 'function') {
      active.onActive();
    }
  };

  // Display what's new if not seen before
  this.showWhatsNew = function(forceShow=false) {
    let current = 20230430;
    let lastShown = localStorage.getItem('whatsNew');
    if (lastShown == null || parseInt(lastShown) < current || forceShow) {
      let options = {
        title: 'What\'s New',
        message:
        '<h3>30 Apr 2023 (Monitor in Internet mode)</h3>' +
        '<p>' +
          'Monitor now partially works in internet mode, allowing you to receive "print" and error message. ' +
          'Update your firmware to at least version 7, set the "When Started" block to "wait for internet connection", restart your device, then click "Connect" when the LED stays on.' +
        '</p>' +
        '<p>' +
          'Sending messages do NOT work. ' +
          'This is difficult to achieve due to the synchronous nature of the mqtt library and may never be supported. ' +
        '</p>' +
        '<h3>27 Apr 2023 (Extensions!)</h3>' +
        '<p>' +
          'IoTy now supports extensions, with 3 extensions for the MPU-6050 (Gyro, Accelerometer), PCA-9685 (Servo driver), and SSD-1306 (OLED display). ' +
          'Find it under "File -> Load extension...".' +
        '</p>' +
        '<p>' +
          'The save format for blocks programs has also been changed to zip (...previously xml). ' +
          'Programs saved in the old xml format will still be loadable, but new saves will be in zip format only.' +
        '</p>' +
        '<h3>25 Apr 2023 (I2C, Access Point Mode)</h3>' +
        '<p>' +
          'I2C blocks are now available. ' +
          'This enables IoTy blocks programs to work with pretty much any I2C device (...and there are lots).' +
        '</p>' +
        '<p>' +
          'Access Point mode is now via "App -> Access Point Page". ' +
          'The new approach of Access Point mode improves compatibility, and should work with all browsers (previously broken on some browsers due to <a href="https://wicg.github.io/private-network-access/">PNA</a> restrictions). ' +
          'You will need to update your IoTy firmware to at least version 6 to use this.' +
        '</p>'
      }
      acknowledgeDialog(options, function(){
        localStorage.setItem('whatsNew', current);
      });
    }
  };

  // Display news
  this.showNews = function() {
    let options = {
      title: 'News',
      message: ''
    }
    acknowledgeDialog(options);
  };
}

// Init class
main.init();
