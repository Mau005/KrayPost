  let nodes = [];
        let instance = null;

        const startNodeId = 'node_start';
        const endNodeId = 'node_end';

        jsPlumb.ready(function() {
            initJsPlumb();
            addNode('Start', 100, 50, startNodeId, 'Inicio del flujo', 'start-node');
            addNode('End', 100, 500, endNodeId, 'Fin del flujo', 'end-node');
        });

        function initJsPlumb() {
            if (instance) {
                instance.destroy();
            }

            instance = jsPlumb.getInstance({
                Connector: "Straight",
                Endpoint: ["Dot", { radius: 5 }],
                PaintStyle: { strokeWidth: 2, stroke: "#61B7CF", outlineStroke: "transparent", outlineWidth: 4 },
                HoverPaintStyle: { strokeWidth: 3, stroke: "#1e8151" },
                ConnectionsDetachable: true,
                Container: "canvas"
            });

            instance.bind("connection", function (info, originalEvent) {
                console.log("Conexión creada:", info.sourceId, "->", info.targetId);
            });

            instance.bind("connectionDetached", function (info, originalEvent) {
                console.log("Conexión eliminada:", info.sourceId, "-x-", info.targetId);
            });

            instance.bind("dblclick", function (connection, originalEvent) {
                if (confirm(`¿Estás seguro de que quieres eliminar la conexión de ${connection.sourceId} a ${connection.targetId}?`)) {
                    instance.deleteConnection(connection);
                    console.log("Conexión eliminada por doble clic.");
                }
            });

            nodes.forEach(node => {
                const el = document.getElementById(node.id);
                if (el) {
                    setupNodeInteractions(el, node.type, node.id);
                }
            });

            instance.repaintEverything();
        }

        function addNode(type, x = 100, y = 100, initialId = null, description = 'Descripción', customClass = '') {
            const id = initialId || `node_${Date.now()}`;
            const div = document.createElement('div');
            
            // Determine custom class based on type
            let typeCustomClass = '';
            if (type === 'Start') typeCustomClass = 'start-node';
            else if (type === 'End') typeCustomClass = 'end-node';
            else if (type === 'CalcPy') typeCustomClass = 'calcpy-node';
            else if (type === 'Router') typeCustomClass = 'router-node';

            div.className = `node ${customClass} ${typeCustomClass}`;
            div.id = id;
            
            let currentDescription = description;
            const existingNode = nodes.find(n => n.id === id);
            if (existingNode) {
                currentDescription = existingNode.description || description;
            }
            
            div.innerHTML = `
                <strong class="node-name" data-node-id="${id}" data-node-type="${type}">${type}</strong>
                <small>${currentDescription}</small>
                ${(id !== startNodeId && id !== endNodeId) ? `<button class="close-btn" onclick="deleteNode('${id}')"><i class="fas fa-times"></i></button>` : ''}
            `;
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            
            document.getElementById('canvas').appendChild(div);

            setupNodeInteractions(div, type, id);
            
            const existingNodeIndex = nodes.findIndex(n => n.id === id);
            if (existingNodeIndex !== -1) {
                nodes[existingNodeIndex] = { 
                    id, 
                    type, 
                    config: existingNode.config || {}, 
                    name: existingNode.name || type, 
                    description: currentDescription,
                    x: x, 
                    y: y 
                };
            } else {
                nodes.push({ id, type, config: {}, name: type, description: currentDescription, x: x, y: y });
            }
        }

        function setupNodeInteractions(nodeElement, type, id) {
            nodeElement.ondblclick = (event) => {
                event.stopPropagation(); 
                openNodeModal(id, type);
            };
            
            instance.draggable(nodeElement, {
                stop: function(event) {
                    const nodeIndex = nodes.findIndex(n => n.id === id);
                    if (nodeIndex !== -1) {
                        nodes[nodeIndex].x = event.pos[0];
                        nodes[nodeIndex].y = event.pos[1];
                    }
                    instance.repaintEverything();
                }
            });
            
            const commonEndpointOptions = {
                endpoint: ["Dot", { radius: 7 }],
                paintStyle: { fill: "#007bff", stroke: "#fff", strokeWidth: 2 },
                hoverPaintStyle: { fill: "#0056b3" },
                isSource: true,
                isTarget: true,
                connectorStyle: { stroke: "#000", strokeWidth: 2 },
                maxConnections: -1,
                connectorOverlays: [
                    ["Arrow", { location: 1, id: "arrow", length: 14, width: 10 }]
                ],
                cssClass: "blue-dot"
            };

            // Router nodes will have specific endpoints
            if (type === 'Router') {
                // A single source endpoint (output) and two target endpoints (input for true/false or left/right)
                instance.addEndpoint(nodeElement, { anchor: "Top", uuid: `${id}_in_endpoint`, ...commonEndpointOptions, isSource: false, isTarget: true }); // Input for the router
                instance.addEndpoint(nodeElement, { anchor: [0.25, 1, 0, 1], uuid: `${id}_out_left_endpoint`, ...commonEndpointOptions, isSource: true, isTarget: false, scope: "left" }); // Output Left
                instance.addEndpoint(nodeElement, { anchor: [0.75, 1, 0, 1], uuid: `${id}_out_right_endpoint`, ...commonEndpointOptions, isSource: true, isTarget: false, scope: "right" }); // Output Right
            } else {
                // Default endpoints for other nodes
                instance.addEndpoint(nodeElement, { anchor: "Top", uuid: `${id}_top_endpoint`, ...commonEndpointOptions });
                instance.addEndpoint(nodeElement, { anchor: "Bottom", uuid: `${id}_bottom_endpoint`, ...commonEndpointOptions });
                instance.addEndpoint(nodeElement, { anchor: "Left", uuid: `${id}_left_endpoint`, ...commonEndpointOptions });
                instance.addEndpoint(nodeElement, { anchor: "Right", uuid: `${id}_right_endpoint`, ...commonEndpointOptions });
            }
        }

        function deleteNode(nodeId) {
            if (nodeId === startNodeId || nodeId === endNodeId) {
                alert("Los nodos 'Start' y 'End' no pueden ser eliminados.");
                return;
            }

            if (confirm(`¿Estás seguro de que quieres eliminar este nodo (${nodeId}) y todas sus conexiones?`)) {
                instance.remove(nodeId); 
                nodes = nodes.filter(n => n.id !== nodeId); 
                console.log(`Nodo ${nodeId} eliminado.`);
            }
        }


        // --- Funciones del Modal ---
        let currentEditingNodeId = null;

        function openNodeModal(id, type) {
            currentEditingNodeId = id;
            const node = nodes.find(n => n.id === id);
            const modalTitle = document.getElementById("modalTitle");
            const modalBody = document.getElementById("modalBody");
            modalBody.innerHTML = '';

            modalTitle.textContent = `Editar ${type} Node`;

            modalBody.innerHTML += `
                <div class="mb-2">
                    <label for="nodeNameInput">Nombre</label>
                    <input class="form-control" id="nodeNameInput" name="name" value="${node.name || type}" />
                </div>
                <div class="mb-2">
                    <label for="nodeDescriptionInput">Descripción</label>
                    <textarea class="form-control" id="nodeDescriptionInput" name="description">${node.description || 'Descripción'}</textarea>
                </div>
            `;

            if (type === 'Endpoint') {
                // Main URL and Method inputs
                modalBody.innerHTML += `
                    <div class="mb-3">
                        <label for="endpointUrlInput" class="form-label">URL</label>
                        <input class="form-control" id="endpointUrlInput" name="url" value="${node.config.url || ''}" />
                    </div>
                    <div class="mb-3">
                        <label for="endpointMethodSelect" class="form-label">Método</label>
                        <select class="form-select" id="endpointMethodSelect" name="method">
                            <option value="GET" ${node.config.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${node.config.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${node.config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="DELETE" ${node.config.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                        </select>
                    </div>

                    <ul class="nav nav-tabs" id="endpointTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="params-tab" data-bs-toggle="tab" data-bs-target="#params" type="button" role="tab" aria-controls="params" aria-selected="true">Parámetros</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="headers-tab" data-bs-toggle="tab" data-bs-target="#headers" type="button" role="tab" aria-controls="headers" aria-selected="false">Headers</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="auth-tab" data-bs-toggle="tab" data-bs-target="#auth" type="button" role="tab" aria-controls="auth" aria-selected="false">Autenticación</button>
                        </li>
                    </ul>
                    <div class="tab-content border border-top-0 p-3 mb-3">
                        <div class="tab-pane fade show active" id="params" role="tabpanel" aria-labelledby="params-tab">
                            <div id="paramsContainer" class="mb-2">
                                </div>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addKeyValuePairRow('paramsContainer', 'param')"><i class="fas fa-plus"></i> Añadir Parámetro</button>
                        </div>

                        <div class="tab-pane fade" id="headers" role="tabpanel" aria-labelledby="headers-tab">
                            <div id="headersContainer" class="mb-2">
                                </div>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addKeyValuePairRow('headersContainer', 'header')"><i class="fas fa-plus"></i> Añadir Header</button>
                        </div>

                        <div class="tab-pane fade" id="auth" role="tabpanel" aria-labelledby="auth-tab">
                            <div class="mb-3">
                                <label for="authTypeSelect" class="form-label">Tipo de Autenticación</label>
                                <select class="form-select" id="authTypeSelect" name="authType">
                                    <option value="none" ${node.config.authType === 'none' ? 'selected' : ''}>No Auth</option>
                                    <option value="basic" ${node.config.authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
                                    <option value="bearer" ${node.config.authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                                    <option value="activeToken" ${node.config.authType === 'activeToken' ? 'selected' : ''}>Active Token</option>
                                    </select>
                            </div>
                            
                            <div id="basicAuthConfigSection" style="display: ${node.config.authType === 'basic' ? 'block' : 'none'};">
                                <div class="mb-2">
                                    <label for="basicAuthUsernameInput">Username</label>
                                    <input type="text" class="form-control" id="basicAuthUsernameInput" name="basicAuthUsername" value="${node.config.basicAuthUsername || ''}" />
                                </div>
                                <div class="mb-2">
                                    <label for="basicAuthPasswordInput">Password</label>
                                    <input type="password" class="form-control" id="basicAuthPasswordInput" name="basicAuthPassword" value="${node.config.basicAuthPassword || ''}" />
                                </div>
                            </div>

                            <div id="bearerAuthConfigSection" style="display: ${node.config.authType === 'bearer' ? 'block' : 'none'};">
                                <div class="mb-2">
                                    <label for="bearerAuthTokenInput">Bearer Token</label>
                                    <input type="text" class="form-control" id="bearerAuthTokenInput" name="bearerAuthToken" value="${node.config.bearerAuthToken || ''}" />
                                </div>
                            </div>

                            <div id="activeTokenConfigSection" style="display: ${node.config.authType === 'activeToken' ? 'block' : 'none'};">
                                <div class="mb-2">
                                    <label for="activeTokenInput">Active Token String</label>
                                    <input type="text" class="form-control" id="activeTokenInput" name="activeToken" value="${node.config.activeToken || ''}" />
                                    <small class="form-text text-muted">Introduce el token directo o string activo.</small>
                                </div>
                            </div>

                            <div id="otherAuthConfigSection"></div>
                        </div>
                    </div>
                `;

                // Add event listener for auth type change
                document.getElementById('authTypeSelect').addEventListener('change', function() {
                    const selectedAuthType = this.value;
                    document.getElementById('basicAuthConfigSection').style.display = 'none';
                    document.getElementById('bearerAuthConfigSection').style.display = 'none';
                    document.getElementById('activeTokenConfigSection').style.display = 'none';
                    // document.getElementById('otherAuthConfigSection').style.display = 'none'; // if you have other sections

                    if (selectedAuthType === 'basic') {
                        document.getElementById('basicAuthConfigSection').style.display = 'block';
                    } else if (selectedAuthType === 'bearer') {
                        document.getElementById('bearerAuthConfigSection').style.display = 'block';
                    } else if (selectedAuthType === 'activeToken') {
                        document.getElementById('activeTokenConfigSection').style.display = 'block';
                    }
                    // Add more conditions for other auth types
                });

                // Populate existing params and headers
                if (node.config.params) {
                    node.config.params.forEach(p => addKeyValuePairRow('paramsContainer', 'param', p.key, p.value));
                }
                if (node.config.headers) {
                    node.config.headers.forEach(h => addKeyValuePairRow('headersContainer', 'header', h.key, h.value));
                }

            } else if (type === 'Transform') {
                modalBody.innerHTML += `
                    <div class="mb-2">
                        <label for="transformMapTextarea">Transformaciones</label>
                        <textarea class="form-control" id="transformMapTextarea" name="map">${node.config.map || ''}</textarea>
                        <small class="form-text text-muted">Ejemplo: .content.user.name => .Datos.Usuario.Name</small>
                    </div>
                `;
            } else if (type === 'CalcPy') {
                modalBody.innerHTML += `
                    <div class="mb-2">
                        <label for="pythonFileInput">Nombre del archivo Python (.py)</label>
                        <input type="text" class="form-control" id="pythonFileInput" name="pythonFile" value="${node.config.pythonFile || ''}" placeholder="ejemplo.py" />
                        <small class="form-text text-muted">Introduce el nombre del archivo Python que se ejecutará (ej: mi_script.py). Este archivo debe estar disponible en el entorno de ejecución.</small>
                    </div>
                `;
            } else if (type === 'Router') {
                modalBody.innerHTML += `
                    <div class="mb-2">
                        <label for="routerConditionInput">Condición de enrutamiento (JSONPath)</label>
                        <input type="text" class="form-control" id="routerConditionInput" name="condition" value="${node.config.condition || ''}" placeholder=".data.status == 'success'" />
                        <small class="form-text text-muted">Introduce una expresión JSONPath para la condición. Si la expresión es verdadera, el flujo irá por el camino de la derecha; si es falsa, irá por el camino de la izquierda. Ejemplo: <code>.data.player.score > 100</code></small>
                    </div>
                `;
            }
            else if (type === 'Start' || type === 'End') {
                modalBody.innerHTML += `
                    <p class="text-muted">Este nodo no tiene configuraciones específicas adicionales.</p>
                `;
            }

            const form = document.getElementById("nodeForm");
            form.onsubmit = function(e) {
                e.preventDefault();
                const formData = new FormData(form);
                const data = {};
                
                // Generic fields
                data.name = formData.get('name');
                data.description = formData.get('description');

                if (type === 'Endpoint') {
                    data.url = formData.get('url');
                    data.method = formData.get('method');
                    data.authType = formData.get('authType');

                    // Handle Params
                    const params = [];
                    document.querySelectorAll('#paramsContainer .param-row').forEach(row => {
                        const key = row.querySelector('.param-key').value.trim();
                        const value = row.querySelector('.param-value').value.trim();
                        if (key !== '' || value !== '') {
                            params.push({ key, value });
                        }
                    });
                    data.params = params;

                    // Handle Headers
                    const headers = [];
                    document.querySelectorAll('#headersContainer .header-row').forEach(row => {
                        const key = row.querySelector('.header-key').value.trim();
                        const value = row.querySelector('.header-value').value.trim();
                        if (key !== '' || value !== '') {
                            headers.push({ key, value });
                        }
                    });
                    data.headers = headers;

                    // Handle Auth based on selected type
                    if (data.authType === 'basic') {
                        data.basicAuthUsername = formData.get('basicAuthUsername');
                        data.basicAuthPassword = formData.get('basicAuthPassword');
                    } else {
                        // Clear other auth data if not selected
                        delete data.basicAuthUsername;
                        delete data.basicAuthPassword;
                    }

                    if (data.authType === 'bearer') {
                        data.bearerAuthToken = formData.get('bearerAuthToken');
                    } else {
                        delete data.bearerAuthToken;
                    }

                    if (data.authType === 'activeToken') {
                        data.activeToken = formData.get('activeToken');
                    } else {
                        delete data.activeToken;
                    }

                } else if (type === 'Transform') {
                    data.map = formData.get('map');
                } else if (type === 'CalcPy') {
                    data.pythonFile = formData.get('pythonFile');
                } else if (type === 'Router') {
                    data.condition = formData.get('condition');
                }
                
                const nodeToUpdate = nodes.find(n => n.id === currentEditingNodeId);
                if (nodeToUpdate) {
                    nodeToUpdate.name = data.name;
                    nodeToUpdate.description = data.description;
                    nodeToUpdate.config = data;

                    const nodeElement = document.getElementById(nodeToUpdate.id);
                    if (nodeElement) {
                        nodeElement.querySelector(".node-name").innerText = nodeToUpdate.name;
                        nodeElement.querySelector("small").innerText = nodeToUpdate.description;
                    }
                }
                
                const modal = bootstrap.Modal.getInstance(document.getElementById("nodeModal"));
                modal.hide();
            };

            const modal = new bootstrap.Modal(document.getElementById("nodeModal"));
            modal.show();
        }

        // Function to add a key-value pair row for params or headers
        function addKeyValuePairRow(containerId, type, initialKey = '', initialValue = '') {
            const container = document.getElementById(containerId);
            const row = document.createElement('div');
            row.className = `${type}-row`;
            row.innerHTML = `
                <input type="text" class="form-control form-control-sm ${type}-key" placeholder="Key" value="${initialKey}">
                <input type="text" class="form-control form-control-sm ${type}-value" placeholder="Value" value="${initialValue}">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.${type}-row').remove()"><i class="fas fa-trash"></i></button>
            `;
            container.appendChild(row);
        }


        function saveFlow() {
            const nodesToSave = nodes.map(n => {
                const el = document.getElementById(n.id);
                if (el) {
                    n.x = el.offsetLeft;
                    n.y = el.offsetTop;
                }
                const { element, ...rest } = n; 
                return rest;
            });

            const connectionsToSave = instance.getAllConnections().map(c => ({
                source: c.source.id, 
                target: c.target.id,
                // Include endpoint UUIDs if you need more precise connection recreation
                // For router, it's useful to know which endpoint was used for the connection
                sourceEndpointUuid: c.endpoints[0] ? c.endpoints[0].getUuid() : null,
                targetEndpointUuid: c.endpoints[1] ? c.endpoints[1].getUuid() : null
            }));

            const data = {
                nodes: nodesToSave,
                connections: connectionsToSave,
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "flow.json";
            a.click();
            URL.revokeObjectURL(a.href); 
        }

        function loadFlow(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    resetCanvas(false); 

                    instance.batch(function() { 
                        data.nodes.forEach(n => {
                            addNode(
                                n.type, 
                                n.x, 
                                n.y, 
                                n.id, 
                                n.description, 
                                n.id === startNodeId ? 'start-node' : (n.id === endNodeId ? 'end-node' : (n.type === 'CalcPy' ? 'calcpy-node' : (n.type === 'Router' ? 'router-node' : '')))
                            );
                            const nodeInArray = nodes.find(_n => _n.id === n.id);
                            if (nodeInArray) {
                                nodeInArray.name = n.name || n.type;
                                nodeInArray.config = n.config || {};
                                nodeInArray.description = n.description || 'Descripción'; 
                            }
                            const nodeElement = document.getElementById(n.id);
                            if (nodeElement) {
                                   nodeElement.querySelector(".node-name").innerText = n.name || n.type;
                                   nodeElement.querySelector("small").innerText = n.description || 'Descripción';
                            }
                        });
                    });

                    instance.batch(function() {
                        data.connections.forEach(c => {
                            if (document.getElementById(c.source) && document.getElementById(c.target)) {
                                   // Try to connect using UUIDs if available, for specific router connections
                                   if (c.sourceEndpointUuid && c.targetEndpointUuid) {
                                        const sourceEndpoint = instance.getEndpoint(c.sourceEndpointUuid);
                                        const targetEndpoint = instance.getEndpoint(c.targetEndpointUuid);
                                        if (sourceEndpoint && targetEndpoint) {
                                            instance.connect({
                                                source: sourceEndpoint,
                                                target: targetEndpoint
                                            });
                                        } else {
                                            console.warn(`UUIDs for connection not found: ${c.sourceEndpointUuid} or ${c.targetEndpointUuid}`);
                                            instance.connect({ source: c.source, target: c.target });
                                        }
                                   } else {
                                        instance.connect({ source: c.source, target: c.target });
                                   }
                            } else {
                                console.warn(`No se pudo conectar: Nodo ${c.source} o ${c.target} no encontrado.`);
                            }
                        });
                    });

                    instance.repaintEverything(); 
                    console.log("Flujo cargado exitosamente.");
                    alert("Flujo cargado exitosamente.");

                } catch (error) {
                    console.error("Error al cargar el flujo:", error);
                    alert("Error al cargar el flujo. Asegúrate de que el archivo JSON sea válido.");
                }
            };
            reader.readAsText(file);
        }

        function resetCanvas(recreateDefaultNodes = true) {
            if (instance) {
                instance.deleteEveryConnection();
                instance.deleteEveryEndpoint();
                instance.destroy();
                instance = null;
            }

            document.getElementById("canvas").innerHTML = '';

            nodes = [];

            initJsPlumb(); 

            if (recreateDefaultNodes) {
                addNode('Start', 100, 50, startNodeId, 'Inicio del flujo', 'start-node');
                addNode('End', 100, 500, endNodeId, 'Fin del flujo', 'end-node');
            }
        }