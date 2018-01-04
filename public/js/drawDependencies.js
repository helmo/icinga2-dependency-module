function formatDependencies(hostData, dependencyData, isHierarchical, positionData, isFullscreen, settings) {
    //Function takes host state data, dependency data, and position data and builds a vis.js usable object using 
    //the HostArray and Host objects. Neccesary due to needing match hosts with passed dependencies.

    var Hosts = new HostArray();

    for (i = 0; i < hostData.results.length; i++) {

        Hosts.addHost(hostData.results[i].attrs);

    }

    for (i = 0; i < dependencyData.results.length; i++) {

        Hosts.addDependency(dependencyData.results[i].attrs);

    }

    if (positionData) {

        for (i = 0; i < positionData.length; i++) {

            Hosts.addPosition(positionData[i]);

        }
    }

    drawNetwork(Hosts, isHierarchical, isFullscreen, settings);

}

function drawNetwork(Hosts, isHierarchical, isFullscreen, settings) {

    //function uses data provided by the 'Hosts' and 'settings' objects to draw a vis.js network
    //In accordance with passed settings and data. 

    var color_border = 'yellow';

    var newHost = false; //is true when a host is present with no positon data.

    color_background = 'white'

    var nodes = new vis.DataSet([]);

    var edges = new vis.DataSet([]);

    for (i = 0; i < Hosts.length; i++) {

        currHost = Object.keys(Hosts.hostObject)[i]; //gets name of current host based on key iter

        if (Hosts.hostObject[currHost].hasDependencies) {

            //colors based on host state

            if (Hosts.hostObject[currHost].status === 'DOWN') {
                color_border = 'red';

                if (parseInt(settings.display_down) === 1) {
                    text_size = parseInt(settings.text_size) / 2; //parse int because an int is returned for MySql, a string for Postgres.
                } else {
                    text_size = 0;
                }
            }

            if (Hosts.hostObject[currHost].status === 'UNREACHABLE') {
                color_border = 'purple';

                if (parseInt(settings.display_unreachable) === 1) {
                    text_size = parseInt(settings.text_size) / 2;
                } else {
                    text_size = 0;
                }
            }

            if (Hosts.hostObject[currHost].status === 'UP') {
                color_border = 'green';

                if (parseInt(settings.display_up) === 1) {
                    text_size = parseInt(settings.text_size) / 2;
                } else {
                    text_size = 0;
                }

            }


            if (parseInt(settings.always_display_large_labels) && Hosts.hostObject[currHost].isLargeNode > 3) {
                text_size = parseInt(settings.text_size) / 2;
            }

            if (parseInt(settings.alias_only)) {
                hostLabel = Hosts.hostObject[currHost].description;
            } else {
                hostLabel = (Hosts.hostObject[currHost].description + "\n(" + currHost + ")");
            }

            if (Hosts.hostObject[currHost].hasPositionData) {

                nodes.update({ //vis.js function
                    id: currHost,
                    label: hostLabel,
                    mass: (Hosts.hostObject[currHost].children.length / 4) + 1,
                    color: {
                        border: color_border,
                        background: color_background
                    },

                    font: {
                        size: text_size
                    },

                    size: (Hosts.hostObject[currHost].children.length * 3 * parseInt(settings.scaling) + 20),

                    x: Hosts.hostObject[currHost].position.x, //set x, y position
                    y: Hosts.hostObject[currHost].position.y,
                });

            } else {
                newHost = true; //has no position data, newly added

                nodes.update({
                    id: currHost,
                    label: hostLabel,
                    mass: (Hosts.hostObject[currHost].children.length / 4) + 1,
                    color: {
                        border: color_border,
                        background: color_background
                    },

                    font: {
                        size: text_size
                    },

                    size: (Hosts.hostObject[currHost].children.length * 3 * parseInt(settings.scaling) + 20),

                });
            }


            for (y = 0; y < Hosts.hostObject[currHost].parents.length; y++) {

                edges.update({
                    from: Hosts.hostObject[currHost].parents[y],
                    to: currHost
                });

            }

        }

    }

    var networkData = {
        nodes: nodes,
        edges: edges
    };

    var container = document.getElementById('dependency-network');

    const hierarchyOptions = {
        layout: {

            hierarchical: {
                enabled: true,
                levelSeparation: 200,
                nodeSpacing: 150,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,
                direction: 'UD',
                sortMethod: 'directed'
            },

        },
        edges: {
            arrows: {
                middle: {
                    enabled: true,
                    scaleFactor: 1,
                    type: 'arrow'
                }
            },
        },
        nodes: {
            shape: 'square',
            fixed: true,
            scaling: {
                min: 1,
                max: 15,
                label: {
                    enabled: true,
                    min: 14,
                    max: 30,
                    maxVisible: 30,
                    drawThreshold: 5
                },

            },
        }
    };

    const networkOptions = {

        layout: {
            improvedLayout: false,
            randomSeed: 728804
        },
        edges: {
            smooth: {
                "forceDirection": "none",
            }
        },

        nodes: {
            scaling: {
                label: true
            },
            fixed: true,
            shape: 'dot'
        }
    };

    if (isHierarchical) { //display using hierarchyOptions
        var network = new vis.Network(container, networkData, hierarchyOptions);

    } else if (isFullscreen) { //display using fullscreen (auto refresh)

        fullscreenMode(container, networkData);

        return;

    } else {

        var network = new vis.Network(container, networkData, networkOptions);

        if (Hosts.isNewNetwork) {
            simulateNewNetwork(network, nodes); //if there is no position data for the network, simulate network.

        } else if (newHost && !isHierarchical) { //if a new host was added, and it is not being displayed in hierarchical layout

            simulateChangedNetwork(network, nodes);

        }

        startEventListeners(network, nodes);

    }
}

function simulateNewNetwork(network, nodes) {

    //simulates new network with a full number of physics iterations, neccecsary to layout an entire new network
    //somewhat accurately. Automatically saves position upon finishing simulation.

    network.setOptions({
        nodes: {
            fixed: false //unlock nodes for physics sim
        }

    });

    //animate notification, loading bar
    $("#notification").html(
        "<div class = notification-content><h3>Generating New Network</h3>"
    ).css({
        "display": "block",
    }).delay(5000).fadeOut();

    $('.fabs').hide();

    $('#loadingBar').css('display', 'block');

    network.on("stabilizationProgress", function (params) { //as network is simulating animate by percentage of physics iter complete
        var maxWidth = 496;
        var minWidth = 20;
        var widthFactor = params.iterations / params.total;
        var width = Math.max(minWidth, maxWidth * widthFactor);
        $('#bar').css("width", width);
        $('#text').html(Math.round(widthFactor * 100) + '%');
    });

    network.once("stabilizationIterationsDone", function () {
        $('#text').html('100%');
        $('#bar').css("width", '496');
        $('#loadingBar').css('opacity', '0');
        // really clean the dom element
        setTimeout(function () {
            $('#loadingBar').css('display', 'none');
        }, 500);
        $('.fabs').show();

        network.storePositions(); //visjs function that adds X, Y coordinates of all nodes to the visjs node dataset that was used to draw the network.

        $.ajax({ //ajax request to store into DB
            url: "/icingaweb2/dependency_plugin/module/storeNodes",
            type: 'POST',
            data: {
                json: JSON.stringify(nodes._data)
            },
            success: function () {
                $("#notification").html(
                    "<div class = notification-content><h3>New Network Saved</h3>"
                ).css({
                    "display": "block",
                }).delay(5000).fadeOut();
            }
        });

        network.setOptions({
            nodes: {
                fixed: true 
            }

        });

    });
}

function simulateChangedNetwork(network, nodes) {
    //function simulates the network for a limited number of physics iterations, 
    //usually enough to correctly place a newly added host/hosts.

    network.setOptions({
        nodes: {
            fixed: false //unlock nodes
        }
    });

    network.startSimulation(); //start new physics sim
    network.stabilize(200); //on sim for 200 iters, usually enough for the node to place itself automatically.

    network.once("stabilizationIterationsDone", function () {
        network.stopSimulation();
        network.setOptions({
            nodes: {
                fixed: true
            }
        });
        network.storePositions(); //after new node added, resave network positions
        $.ajax({
            url: "/icingaweb2/dependency_plugin/module/storeNodes",
            type: 'POST',
            data: {
                json: JSON.stringify(nodes._data)
            },
            success: function () {
                $("#notification").html(
                    "<div class = notification-content><h3>Network Change Detected</h3>"
                ).css({
                    "display": "block",
                }).delay(5000).fadeOut();
            },
            error: function (data) {
                console.log(data);
                alert('Error Loading Node Positional Data, Please Check Entered Information\n\n' + data.responseJSON['message']);
            }
        });

    });
}

function startEventListeners(network, nodes) {

    //function launches all event listeners for the network, and buttons.

    network.on("doubleClick", function (params) { //double click on node listener
        if (params.nodes[0] != undefined) {
            href = location.href.split('/');
            location.href = 'http://' + href[2] + '/icingaweb2/monitoring/list/hosts#!/icingaweb2/monitoring/host/show?host=' + params.nodes[0]; //redirect to host info page.
        }
    });

    network.on("selectNode", function (params) { //on selecting node, background of label is made solid white for readabillity. 
        var clickedNode = network.body.nodes[params.nodes[0]];
        font_size = clickedNode.options.font.size;
        clickedNode.setOptions({
            font: {
                size: 30,
                background: 'white',
            }
        });
    });

    network.on("deselectNode", function (params) { //on node deselect, label set back to transparent.

        var clickedNode = network.body.nodes[params.previousSelection.nodes[0]];
        clickedNode.setOptions({
            font: {
                size: font_size,
                background: 'none',
            }
        });

    });

    $('#editBtn').click(function () { //on edit

        network.setOptions({ //unlock nodes for editing
            nodes: {
                fixed: false
            },
        });

        $('.fab-btn-sm').toggleClass('scale-out'); // show secondary FABs
        if ($('.fab-btn-sm').hasClass('scale-out')) { //if already scaled out, second click hides secondary FABs and locks nodes
            network.setOptions({
                nodes: {
                    fixed: true
                }
            });
        }
    });

    $('.fab-btn-delete').click(function () {
        $.ajax({ //ajax request to store into DB
            url: "/icingaweb2/dependency_plugin/module/storeNodes",
            type: 'POST',
            data: {
                json: JSON.stringify('RESET')
            },
            success: function () {
                setTimeout(function () {

                    window.location.replace("./network"); //on succes redirect to network.

                }, 2000);
                $("#notification").html(
                    "<div class = notification-content><h3>Network Reset</h3>"
                ).css({
                    "display": "block",
                }).delay(5000).fadeOut();
            }
        });
    });


    $('.fab-btn-save').click(function () { //on save
        network.setOptions({
            nodes: {
                fixed: true
            }
        });

        network.storePositions(); //visjs function that adds X, Y coordinates of all nodes to the visjs node dataset that was used to draw the network.

        $.ajax({ //ajax request to store into DB
            url: "/icingaweb2/dependency_plugin/module/storeNodes",
            type: 'POST',
            data: {
                json: JSON.stringify(nodes._data)
            },
            success: function () {
                $("#notification").html(
                    "<div class = notification-content><h3>Changes Saved Successfully</h3>"
                ).css({
                    "display": "block",
                }).delay(5000).fadeOut();
            }
        });
    });

}

function Host(hostData) {

    //function accepts raw host data pulled from icinga 2 api, and formats it into a more usable format 
    //while providing functions to add dependencies and position 

    determineStatus = (state, wasReachable) => {

        if (state === 0) {
            return 'UP';
        }
        else if (state === 1 && !wasReachable) {

            return 'UNREACHABLE'

        } else {

            return 'DOWN';
        }

    }

    this.name = '' || hostData.name;
    this.status = determineStatus(hostData.state, hostData.last_reachable);
    this.description = '' || hostData.display_name;
    this.hasDependencies = false;
    this.parents = [];
    this.isLargeNode = false;
    this.group = '' || hostData.groups;
    this.children = [];
    this.position = {
        x: 0,
        y: 0
    };
    this.hasPositionData = false;

    this.addParent = (parent) => {
        this.parents.push(parent);
        this.hasDependencies = true;
    }

    this.addChild = (Child) => {
        this.children.push(Child);
        this.hasDependencies = true;

        if (this.children.length > 3) {
            this.isLargeNode = true;
        }
    }

    this.setPositionData = (data) => {
        this.position.x = data.node_x;
        this.position.y = data.node_y;
        this.hasPositionData = true;
    }
}

function HostArray() {

    this.hostObject = {};

    this.isNewNetwork = true; //if there any node has position data

    this.length = 0;

    this.addHost = (hostData) => {
        this.hostObject[hostData.name] = new Host(hostData)

        this.length++;
    }

    this.addDependency = (dependency) => {

        childName = dependency.child_host_name;

        parentName = dependency.parent_host_name;

        if (isInHosts(parentName)) {

            this.hostObject[parentName].addChild(childName);

        }

        if (isInHosts(childName)) {

            this.hostObject[childName].addParent(parentName);
        }

    }

    this.addPosition = (positionData) => {

        name = positionData.node_name;

        if (isInHosts(name)) {

            this.hostObject[name].setPositionData(positionData);

            this.isNewNetwork = false;

        }

    }

    isInHosts = (name) => {

        return (this.hostObject[name] != undefined);
    }


}