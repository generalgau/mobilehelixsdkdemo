$( document ).ready(function() {
		initHelixDB();
		definePersistenceMigrations();
		Helix.DB.initPersistence();
		$("body").css("overflow", "hidden");
		
		var stateManager = {
			thread_id: null,
			user: null,
			lastUploadedChat: 0,
			msg_to: null,
			chatListInit: 0,
			lastsyncmsgid: 0,
			offline: true
		};
		
		var messagelist, threadlist;
		
		$(document).on('pageshow', '#login-page', function(){
			console.log ("state manager cleared");
			stateManager = {
				thread_id: null,
				user: null,
				lastUploadedChat: 0,
				msg_to: null,
				chatListInit: 0,
				lastsyncmsgid: 0
			};
		});

		$(document).on('pageinit', '#login-page', function(){ 
			$('.onlinebutton').show();
			 $(document).on('click', '.onlinebutton', function(){
				if ( stateManager.offline)
					goOnline();
				else
					goOffline();
			 });
			 $(".ui-icon-loading").hide();
		});	
		$(document).on('pageinit', '#thread-page', function(){ 
			$(".ui-icon-loading").show();
			var s = Helix.DB.getSchemaForTable("Thread");
			threadlist = $('#myThreadsList').helixDatalist({
				headerText: "Chat Threads - Mobile Helix Datalist" ,
				itemList: null,
				condition: s,
				rowRenderer: function(parentDiv, list, row) {
					var other="";
					if ( row.thread_user1 == stateManager.user )
						other = row.thread_user2;
					else
						other = row.thread_user1;
					var markup = $('<div class="chat_thread" msg_to="' + other + '" id="' + row.thread_id + '"/>').append(
						"<img src='images/" + other + ".jpg' />" ).append(
						"&nbsp;&nbsp;&nbsp; <b> " +  other + "</b></li>" );
					list.createListRow(parentDiv, { body: markup });
					return true;
				},
				doGlobalFilter: function (allItemsCollection, fieldName, selectedVal) {
					return allItemsCollection.filter(fieldName, '=', selectedVal);
				},
				indexedSearch: function (searchText, completion){
					if (!searchText)
						return;
					completion(Helix.DB.getSchemaForTable("Thread").search(searchText));
				},
				holdAction: function(a, b, c){ 
					console.log("selected " + a + " selectedGroup " + b + " string " + c) 
				}
			});

			
			 $(document).on('click', '.chat_thread', function(){
				stateManager.thread_id = $(this).attr('id');
				stateManager.msg_to = $(this).attr('msg_to');
				$.mobile.changePage("#chat-page"); 			
			 });
			 
			 $(document).on('click', ".special-msg-ops", function(){
				$(this).attr('id')
				add_messages( $(this).attr('id') );
			 });
			 $(document).on('click', "#logout", function(){
				$.mobile.changePage("#login-page"); 			
			 });
		});	
		
		$(document).on('pageinit', '#chat-page', function(){ 
			var s = Helix.DB.getSchemaForTable("Message");
			messagelist = $('#myMessageList').helixDatalist({
				headerText: "Messages window - Mobile Helix Datalist" ,
				itemList: null, 
				itemsPerPage: 75,
				condition: s,
				rowRenderer: function(parentDiv, list, row) {
					var markup = $('<div />').append(
						"<img src='images/" + row.msg_from + ".jpg' />" ).append(
						row.created + ":&nbsp;&nbsp;&nbsp; <b> " +  row.message + "</b></li>" );
					list.createListRow(parentDiv, { body: markup });
					return true;
				},
				indexedSearch: function (searchText, completion){
					if (!searchText)
						return;
					completion(Helix.DB.getSchemaForTable("Message").search(searchText));
				}
			});
			
			$(document).on('click', '#back_button', function(){				
				$.mobile.changePage("#thread-page"); 			
			});
			$(document).on('click', '.msg-send-button', function(){				
				send();
			});

		});
		$(document).on('pageshow', '#chat-page', function(){ 
			
			getMessages( );
				
		});	
		$(document).on('pageshow', '#thread-page', function(){ 
			
			getThreads( );
				
		});
		
		$(document).on('hxPersistenceReady', function () {
			$(".ui-icon-loading").show();
			var users = {
				__hx_schema_name: "User",
				uid: '1',
				user: 'empty',
				__hx_key: "uid",
				__hx_sorts:{},
				__hx_filters:{},
				__hx_global_filters:{},
				__hx_text_index:[]
			};
			
			var messages = {
					__hx_schema_name: "Thread",
					Message: [{
						__hx_schema_name: "Message",
						message_id: '1',
						thread_id: '1',
						msg_to: 'empty',
						msg_from: 'empty',
						message: 'empty',
						created: 'empty',
						__hx_key: "message_id",
						__hx_sorts:{},
						__hx_filters:{},
						__hx_global_filters: {},
						__hx_text_index:["msg_to","msg_from","message"]
					}],
					thread_id: '1',
					thread_user1: 'empty',
					thread_user2: 'empty',
					created: 'empty',
					modified: 'empty',
					last_msg_sent: '1',
					__hx_key: "thread_id",
					__hx_sorts:{},
					__hx_filters:{},
					__hx_global_filters: {},
					__hx_text_index:["thread_user1", "thread_user2"]
			};
			
			Helix.DB.generatePersistenceSchema(messages, "Thread", function () {
					persistence.dump(function (dump) {
						console.log(dump);
						Helix.DB.generatePersistenceSchema(users, "User", function () {
							persistence.dump(function (dump) {
								console.log(dump);
								$(document).on('click', '#login-btn', function() {
									logmein();
								});
								$.mobile.changePage("#login-page"); 			
								$(".ui-icon-loading").hide();
							});
						
						});
					});
				});	
			
		});
		
		
		function loginOfflineUser(){
			var u = $("#username").val();
			if ( u === "" ){
				alert ( "you must enter a username" );
				$(".ui-icon-loading").hide();
				return;
			}
			var s = Helix.DB.getSchemaForTable("User");
			Helix.DB.loadAllObjects( s, function(obj){
				var u = $("#username").val();
				obj.filter( 'user', 'like', u).newEach( {
					eachFn: function(elem) { 
						console.log ("offline user: " + elem.user);
						stateManager.user = elem.user;
						goOffline();
						$.mobile.changePage("#thread-page"); 
					},
					doneFn: function(ct) {
					},
					startFn: function(ct) {  
						if (ct == 0)
							alert("invalid user for offline use");
					}
				});
				$(".ui-icon-loading").hide();
			});
		}
		
		function goOffline(){
			stateManager.offline = true;
			$('.onlinebutton').html('Currently offline. Want to connect?');
			$('.onlinebutton').removeClass( "btn-success" ).addClass( "btn-danger" );
		}
		
		function goOnline(){
			
			stateManager.offline = false;
			$('.onlinebutton').html('Currenly online. Force device offline?');
			$('.onlinebutton').addClass( "btn-success" ).removeClass( "btn-danger" );
			
			if ( stateManager.user != null ){
				sendUnsentMessages();
				fetchOnlineThreads();
			}
		}
		
		function add_messages( opp ){
			var msgs = 0;
			if (opp === "add"){
				msgs = 100;	
			}
			else if ( opp === "adds" ){
				msgs = 500;
				opp = "add";
			}
			$.ajax({
			  dataType: 'jsonp',
			  url: 'http://link-sdkdemo1.rhcloud.com/messages/' + opp,
			  data: {
				Message: {
					special: msgs 
				}
			  },
			  success: function(data){
				console.log ( data );
				if ( opp === "delete" ){
					window.d3 = $.parseJSON(data); // payload is a string of messages to delete ("1","2","3",...)
					var delta = {
						__hx_type: 1001,
						__hx_schema_type: 'Message',
						adds: '',
						deletes:  window.d3.payload,
						updates: ''
					};
					var s = Helix.DB.getSchemaForTable("Message");
					Helix.DB.synchronizeObject(
						delta,
						s,
						function (obj) {
							console.log (obj);
							$.mobile.changePage("#login-page"); 			
						},
						null, null, null
					);
				} else {
					$.mobile.changePage("#login-page"); 			
				}
				
			  }	
			});
		}

		function logmein() {
			if ( stateManager.offline == true ){
				loginOfflineUser();
			} else {
				var user = $("#username").val();
				if ( user === "" ){
					alert ( "you must enter a username" );
					$(".ui-icon-loading").hide();
					return;
				}
				if ( $("#password").val() === "" ){ 
					alert ( "you must enter a password" );
					$(".ui-icon-loading").hide(); 
					return;
				}
				
				$.ajax({
					dataType: 'jsonp',
					url: 'http://link-sdkdemo1.rhcloud.com/users/login',
					data: {
						User: {
							username: $("#username").val(),
							password: $("#password").val(),				  
						}
					},
					success: function(data){
						//alert('that worked');
						window.d3 = $.parseJSON(data);
						var d = $.parseJSON(data);
						if (d.success === true ) {
							stateManager.user = d.payload.user;
							Helix.DB.synchronizeObject(d.payload, Helix.DB.getSchemaForTable("User"), function(persistentObj) {
								console.log("user stored in DB");
								stateManager.user = d.payload.user;
								$.mobile.changePage($("#thread-page")); 		
							});						
						}
						else {
							$('#password').val("");
							alert ("login failed. Try again?");
						}
					},
					error: function(data){
						$('#password').val("");
						goOffline();
					}
				});
			}
		}
		
		function fetchOnlineThreads(){
			// ok, now let's see if we can get new stuff from the server:
			$.ajax({
				  dataType: 'jsonp',
				  url: 'http://link-sdkdemo1.rhcloud.com/threads/index',
				  data: {
					isMobileHelix: 1
				  },
				  success: function(data){
					var d = $.parseJSON(data);
					if (d.message === "thread data"){
						d.payload.last_msg_sent = 0;
						var s = Helix.DB.getSchemaForTable("Thread");
						Helix.DB.synchronizeObject(d.payload, s,function(persistentObj) {
							window.d = persistentObj;
							console.log(d.payload.length + " threads synchronized");
							threadlist.helixDatalist( "refreshList", persistentObj, s, null, function(){
								Helix.Layout.layoutPage(); 		
								$(".ui-icon-loading").hide();
							});
							},null,null,null
						)
					}
				},
				error: function(data){
					console.log( "Can't get threads from server :(");
					goOffline();
					
				}
			});
		}
		function getThreads() {
			$(".ui-icon-loading").show();
			// make sure we have a valid user
			if ( stateManager.user == null ){
				$.mobile.changePage("#login-page"); 			
				return;
			}
			if (stateManager.offline == false){
				fetchOnlineThreads();
			} else {
				var s = Helix.DB.getSchemaForTable("Thread");
				Helix.DB.loadAllObjects( s, function(obj){
					if (obj){
						threadlist.helixDatalist( "refreshList", obj, s, s, function(){
							Helix.Layout.layoutPage(); 
							$(".ui-icon-loading").show();
							console.log ( "refreshData for threadlist" );
						});
					} else {
						console.log ("offline thread get failed");
						alert (" no offline threads avaialble ");
					}
				});
			}
		}

		function sendUnsentMessages(){
			if ( stateManager.user ){
				Helix.DB.loadAllObjects( Helix.DB.getSchemaForTable("Message"), function(obj){
					if ( obj ){
						// get the latest message sent by user
						obj.filter('msg_from', '=', stateManager.user).filter('message_id', '=', "0.0").order("message_id", true, false).newEach({
							eachFn: function(elem) { 
								var m = {
									Message:{
										thread_id: elem.thread_id,
										message: elem.message,
										msg_from: elem.msg_from,
										msg_to: elem.msg_to
									}
								};
								sendOnlineMessages(m); 
								
							},
							doneFn: function(ct) {
								// delete the temporary messages
								var delta = {
									__hx_type: 1001,
									__hx_schema_type: 'Message',
									adds: '',
									deletes:  [ "0.0" ],
									updates: ''
								};
								Helix.DB.synchronizeObject(
									delta,
									Helix.DB.getSchemaForTable("Message"),
									function (obj) {
										persistence.dump(function (dump) {
											console.log(dump);
											getOnlineMessage();
										});
									},
									null, null, null
								);		
								
							},
							startFn: function(ct) {  
								if ( ct === 0 ){
									//great, no unset messages!
								}
							}
						});
					}
				});
			}
		}

		function confirmSync(){
			// get the highest msg_to and msg_from IDs
			var lastMsg = 0;
			var s = Helix.DB.getSchemaForTable("Message"); 
			Helix.DB.loadAllObjects( s, function(obj){
				//Make sure we have at least some received messages:
				if ( obj ){
					obj.filter('thread_id', '=', stateManager.thread_id).order("message_id", true, false).limit(1).newEach({ //.filter( 'msg_from', '<>', stateManager.user).newEach( {
						eachFn: function(elem) { 
							// This is the latest msg we have (it may or may not be sent by us, doesn't matter!)
							console.log ("lastMsg: " + elem.message_id);
							lastMsg = elem.message_id;
							$.ajax({
								dataType: 'jsonp',
								url: 'http://link-sdkdemo1.rhcloud.com/threads/lastsynchok',
								data: {
									thread_id: stateManager.thread_id,
									lastsyncmsgid: lastMsg,
									msg_to: stateManager.msg_to
								},
								success: function(data){
									var d = $.parseJSON(data);
									if (d.message === "lastsyncmsgid"){
										if ( lastMsg != d.payload.lastReceived ){
											stateManager.lastsyncmsgid = lastMsg;
											getMessages();
										} else {
											stateManager.lastsyncmsgid = d.payload.lastReceived;
											stateManager.lastUploadedChat = d.payload.lastSent;
										}
									} 
								}
							});

						},
						doneFn: function(ct) {
						},
						startFn: function(ct) {  
							if ( ct === 0 ){
								$.ajax({
									dataType: 'jsonp',
									url: 'http://link-sdkdemo1.rhcloud.com/threads/lastsynchok',
									data: {
										thread_id: stateManager.thread_id,
										lastsyncmsgid: 0,
										msg_to: stateManager.msg_to
									},
									success: function(data){
										if ( stateManager.lastsyncmsgid != 0 ){
											stateManager.lastsyncmsgid = 0;
											stateManager.lastUploadedChat = 0;
											getMessages();	 
										}
									}
								});
								
							}
						}
					});
				} 
			});
		}
		function getOnlineMessage(){
			// now we try to reach out to the server
			$.ajax({
				dataType: 'jsonp',
				url: 'http://link-sdkdemo1.rhcloud.com/threads/view/',
				data: {
					thread_id: stateManager.thread_id,
					last_msg: stateManager.lastsyncmsgid
				},
				success: function(data){
					window.d3 = $.parseJSON(data);
					var d = $.parseJSON(data);
					if (d.message === "thread data" && d.payload.Message.length > 0){
						// lets make these adds
					var delta = 
						{
							thread_id: d.payload.Thread.thread_id,	
							thread_user1: d.payload.Thread.thread_user1,
							thread_user2: d.payload.Thread.thread_user2,
							created: d.payload.Thread.created,
							modified: d.payload.Thread.modified,
							Message: {
								__hx_schema_type: 'Message',
								__hx_type: 1001,
								adds: d.payload.Message,
								deletes:  '',
								updates: ''
							}
						};
							

						var s = Helix.DB.getSchemaForTable("Thread");
 						Helix.DB.synchronizeObject(delta, s,function(persistentObj) {
							window.d = persistentObj;
							console.log("threads synchronized");
							var new_s = Helix.DB.getSchemaForTable("Message");
							messagelist.helixDatalist( "refreshList", persistentObj.Message, new_s, null,  function(){
								Helix.Layout.layoutPage(); 
								confirmSync();
							});
							},null,null,null
						);
					} else {
						// no messages received - let's show what we have in the table and then confirm the sync isn't bad
						var s = Helix.DB.getSchemaForTable("Thread");
						console.log("fetching offline messages.");
						Helix.DB.synchronizeObjectByKey( stateManager.thread_id, s, function(obj){
							if ( obj ){
								var new_s = Helix.DB.getSchemaForTable("Message");
								messagelist.helixDatalist( "refreshList", obj.Message, new_s, null, function(){
									Helix.Layout.layoutPage(); 
									
								});
							}
						});
						confirmSync();
					}
				}, error: function(data){
					console.log(data);
					// no messages received - let's make sure we're synchronized between local and server!
					confirmSync();
				}
				
			});
		
		}
		function getMessages(  ) {
			$(".ui-icon-loading").show();
			// first make sure we have a thread selected
			if ( stateManager.thread_id == null || stateManager.user == "" || stateManager.msg_to == ""){
				$.mobile.changePage("#login-page"); 			
				return;
			}
			if ( stateManager.offline == false ){
				getOnlineMessage();
			} else {
				// first we load up what we have
				var s = Helix.DB.getSchemaForTable("Thread");
				console.log("fetching offline messages.");
				Helix.DB.synchronizeObjectByKey( stateManager.thread_id, s, function(obj){
					if ( obj ){
						var new_s = Helix.DB.getSchemaForTable("Message");
						messagelist.helixDatalist( "refreshList", obj.Message, new_s, null, function(){
							Helix.Layout.layoutPage(); 
							
						});
					}
				});
			}
		}

		function sendOnlineMessages(m){
				
			$.ajax({
				 //type: "POST",
				 dataType: 'jsonp',
				 url: 'http://link-sdkdemo1.rhcloud.com/messages/add',
				 data: m,
				success: function(data){
					$("#messagebox").val("");
					var d = $.parseJSON(data);
					if (d.message === "msg saved"){
					var delta = 
						{
							thread_id: d.payload.Thread.thread_id,	
							thread_user1: d.payload.Thread.thread_user1,
							thread_user2: d.payload.Thread.thread_user2,
							created: d.payload.Thread.created,
							modified: d.payload.Thread.modified,
							Message: {
								__hx_schema_type: 'Message',
								__hx_type: 1001,
								adds: [ d.payload.Message ],
								deletes:  '',
								updates: ''
							}
						};
						var s = Helix.DB.getSchemaForTable("Thread");
 						Helix.DB.synchronizeObject(delta, s,function(persistentObj) {
							window.d = persistentObj;
							console.log("threads synchronized");
							var new_s = Helix.DB.getSchemaForTable("Message");
							messagelist.helixDatalist( "refreshList", persistentObj.Message, new_s, null,  function(){
								Helix.Layout.layoutPage(); 
								confirmSync();
							});
							},null,null,null
						);
					}
				}
			});	  

		}
		function send( ) {
			
			
			if ( stateManager.offline ){
				var m = {
					thread_id: stateManager.thread_id,
					message_id: 0,
					message: $('#messagebox').val(),
					msg_from: stateManager.user,
					msg_to: stateManager.msg_to
				};
				var delta = 
				{
					__hx_schema_type: 'Thread',
					__hx_type: 1001,
					adds: '',
					deletes: '',
					updates: [{
						thread_id: stateManager.thread_id,	
						Message: {
							__hx_schema_type: 'Message',
							__hx_type: 1001,
							adds: [ m ],
							deletes:  '',
							updates: ''
						}
					}]
				};
				Helix.DB.synchronizeObject(
					delta,
					Helix.DB.getSchemaForTable("Thread"),
					function (obj) {
						console.log ("added a new sent message to offline queue" + obj);
						getMessages();
					},
					null, null, null
				);
							
			} else {
				var m = {
					Message:{
						thread_id: stateManager.thread_id,
						message: $('#messagebox').val(),
						msg_from: stateManager.user,
						msg_to: stateManager.msg_to
					}
				};
				sendOnlineMessages( m );
			}

		}


		
		function backToThreads(){
			$.mobile.changePage("#thread-page"); 			
			
		}
		
		
	});
