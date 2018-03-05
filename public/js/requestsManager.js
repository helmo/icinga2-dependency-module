// function getRequests(isHierarchical) {

// if (window.location.href.indexOf('Fullscreen') > -1) {
//     var isFullscreen = true;
//     $('.fabs').hide();
// }

// $.when(

function getDependencies() {

    var promise = new Promise((resolve, reject) => {

        $.ajax({
            url: "/icingaweb2/dependency_plugin/module/getDependency", //get dependencies
            type: 'GET',
            success: function (dependencyData) {

                dependencies = (JSON.parse(dependencyData));
                resolve({
                    type: 'dependencies',
                    data: dependencies,
                });
            },
            error: (data) => {
                reject({
                    'type': 'dependencies',
                    'data': data['responseText']
                });

            }

        });

    });

    return promise;

}

function getHosts() {

    var promise = new Promise((resolve, reject) => {

        $.ajax({
            url: "/icingaweb2/dependency_plugin/module/getHosts", //get host states
            type: 'GET',
            success: function (hostData) {

                hosts = (JSON.parse(hostData));
                resolve({
                    type: 'hosts',
                    data: hosts
                });
            },
            error: (data) => {
                reject({
                    'type': 'hosts',
                    'data': data['responseText']
                });
            }
        });

    });

    return promise;

}

function getNodePositions() {

    var promise = new Promise((resolve, reject) => {
        $.ajax({
            url: "/icingaweb2/dependency_plugin/module/getNodes", //get node positions
            type: 'GET',
            success: function (response) {
                response = JSON.parse(response);
                if (response === "EMPTY!") {
                    resolve({
                        'type': 'positions',
                        'data': null
                    });
                } else {
                    resolve({
                        'type': 'positions',
                        'data': response
                    });
                }

            },
            error: (data) => {
                reject({
                    'type': 'positions',
                    'data': data['responseText']
                });
            }
        });
    });

    return promise;

}

function getSettings() {

    var promise = new Promise((resolve, reject) => {


        $.ajax({
            url: "/icingaweb2/dependency_plugin/module/getgraphSettings", //get host states
            type: 'GET',
            success: function (data) {

                settings = JSON.parse(data);

                parsedSettings = {}

                for (i = 0; i < settings.length; i++) {

                    if (settings[i]['setting_type'] === 'bool') {
                        parsedSettings[settings[i]['setting_name']] = (settings[i]['setting_value'] === 'true');
                    } else if (settings[i]['setting_type'] === 'int') {

                        parsedSettings[settings[i]['setting_name']] = (parseInt(settings[i]['setting_value']));

                    } else {

                        parsedSettings[settings[i]['setting_name']] = settings[i]['setting_value'];

                    }

                }
                resolve({
                    'type': 'settings',
                    'data': parsedSettings
                });
            },
            error: (data) => {
                reject({
                    'type': 'settings',
                    'data': data['responseText']
                });
            }

        });

    });

    return promise;

}