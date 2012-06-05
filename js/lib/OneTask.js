/**
 * 用于确保同一段代码在本地同域浏览器窗口之间，只有一个会执行任务，并且同步结果给其他窗口。
 * NOTE：只能尽量保证，因为不确定JS是否并行
 * NOTE: IE6、7，采用cookies传输信息，所以不能传输大批量信息
 * 实现原理：采用抢占式设计。后面加载的页面会抢占成为server。
 *           初始化结束后，不再抢占，只有server remove之后才会结束。
 *           server定时更新servertime，并共享给其他页面
 *           其他页面定时检查server状态和时间，如果server remove或关闭页面，则开始抢占
 *           第一个抢占成功的成为server。
 *
 * @author mzhou
 * @eg  var t =  new OneTask(
 *                  'Name',
 *                  function( syncReturn, n1, n2, n3 ) {
 *                      n1 === 1;
 *                      n2 === 2;
 *                      n3 === 3;
 *                      // 多个页面中只server会执行此函数
 *                      // syncReturn 将结果返回给回调函数
 *                      syncReturn({
 *                          'm':'11'
 *                       });
 *                  },
 *                  {
 *                      interval: 30000,        // 任务的运行间隔时间
 *                      serverTimeout: 1000,    // 服务器页面不活动后多久会认为它已经关闭
 *                      params: [1,2,3]         // 任务的参数
 *                  }
 *               );
 *      t.start();
 *      t.stop();
 *      // 注册定时回调，此函数会在当前页面的任务运行而定时运行
 *      t.onCallBack(function( data ) {
 *          this === t;
 *          data.m === 11;
 *      });
 *      // 注册任务返回数据更新时候的回调函数，此函数不会随着任务结束而定时运行
 *      t.onChangeCallBack(function( data ) {
 *          this === t;
 *          data.m === 11;
 *      });
 *      NOTE: 上面两个任务执行结果的回调函数，输入为任务的执行结果
 *            this为当前任务对象
 *            返回结果如果是null，则是处于切换阶段，不能将null作为正常结果处理
 *
 * @log 第一版实现
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "store.js";
//@import "JSON2.js";
//@import "store.js";
//@import "Event.js";
G.def('OneTask', ['store', 'JSON2', 'cookies', 'Event'], function(store, JSON2, cookies, Event) {
    'use strict';
    var pageId = location.pathname + '?' + new Date().getTime() + Math.random(),
        set = store.isSupport ? store.set : function(key, value) {
            cookies.set(key, JSON.stringify(value));
        },
        get = store.isSupport ? store.get : function(key) {
            var v = cookies.get(key);
            return v ? JSON.parse(v) : null;
        },
        remove = store.isSupport ? store.remove : function(key) {
            cookies.remove(key);
        };

    /**
     * 任务类
     * @param {string} name 任务名
     * @param {function} asyncJob 任务执行函数
     *                       参数为syncReturn函数，将返回数据传给return，OneTask会帮你把数据同步发给其他页面。
     *                       其他参数通过option.params传递
     * @param {object} option 可选参数：
     *                      params: 【数组/或单个参数】传给asyncJob的参数,尽可能少用params参数
     *                      serverTimeout: 【数字】服务器的不在线
     *                      interval: 【数字】任务的间隔执行时间，默认30秒
     */
    function Task(name, asyncJob, option) {
        this.name = 'T' + name; // 任务名，被用作key
        this.serverTimeKey = this.name + 'T'; // 服务器时间的key
        this.jobMsgKey = this.name + 'M'; // 任务消息的key
        this.asyncJob = asyncJob; // 异步任务
        this.jobMsg = null; // 任务信息，默认为null
        // （因为任务切换时候get方法得到的为null）
        this.isServer = false; // 是否是server
        this.params = option && option.params; // 任务参数
        this.serverTimeout = (option && option.serverTimeout) || 2000; // 服务器timeout
        this.intervalTime = (option && option.interval) || 30000; // 任务执行间隔
        this.timeUpdateInterval = 0; // server更新服务器时间的间隔 定时器句柄
        this.jobRunInterval = 0; // 任务执行间隔 定时器句柄
        this.serverCheckInterval = 0; // 检查服务器状态 定时器句柄
        this.isRunning = false; // 是否正在运行
        this.inited = false; // 
        var self = this;
        // 设置callback 与定时器
        function run() { // self.run函数的包装
            self._run();
        }
        self.callback = function(msg, isJSON) {
            self.fire('callback', isJSON ? msg : JSON.parse(msg));
            self.jobRunInterval = setTimeout(run, self.intervalTime);
        };
    }
    Event.extend(Task);

    /**
     * 只有server会执行任务，其他页面上的callback会在run时得到任务结果
     */
    Task.prototype._run = function() {
        var self = this;
        if (!self.isRunning) { // 没有运行则停止
            return this;
        }
        if (self.isServer) {
            // 处理syncJob返回的data
            var syncReturnResolve = function (data) {
                // 重新check，避免在执行过程中被抢占（即使被抢占了也没关系，过一段时间就会平稳）
                if (self.isServer) {
                    // 执行到此处还是有可能被抢占，所以抢占成功后一定要清楚Msg
                    var msg = JSON.stringify(data);
                    set(self.jobMsgKey, msg);
                    if (self.jobMsg !== msg) {
                        self.fire('changeCallBack', data);
                        self.jobMsg = msg;
                    }
                    self.callback(data, true);
                } else {
                    // 从服务器获取信息
                    self.callback(self.jobMsg);
                }
            };
            if (this.params) {
                // concat会多生成数组，为了性能尽可能少用params参数
                self.asyncJob.apply(self, [syncReturnResolve].concat(this.params));
            } else {
                self.asyncJob.call(self, syncReturnResolve);
            }
        } else {
            // 从服务器获取信息
            self.callback(self.jobMsg);
        }
        return this;
    };

    /**
     * 开始任务
     */
    Task.prototype.start = function() {
        var self = this;
        if (self.isRunning) {
            return this;
        }
        self.isRunning = true;

        // 抢占成为server
        self.switchToServer();

        // 支持且未初始化时，绑定onStorage事件
        if (store.isSupport && !self.inited) {
            // 获取最新消息并存储
            store.onStorage(self.jobMsgKey, function(msg) {
                if (self.isRunning && self.jobMsg !== msg) {
                    self.jobMsg = msg;
                    self.fire('changeCallBack', JSON.parse(msg));
                }
            });
        }
        // 定时检查server是否宕机，以及cookies是否更新
        self.serverCheckInterval = setInterval(function() {
            self.check();
            // document.title = ''
            //    + (self.useCookie ? '(C)' : '(S)')
            //    + (self.isServer ? 'Server' : 'Client')
            //    + JSON.stringify( self.jobMsg )
            //    + new Date().getSeconds();
            if (self.isServer) {
                return;
            }
            var serverTime = parseInt(get(self.serverTimeKey), 10) || 0,
                // 可能返回为NaN
                now = new Date().getTime();
            // 如果没有设置服务器时间，或者是服务器超时了，则开始抢占
            if (!serverTime || ((now - serverTime) > self.serverTimeout)) {
                self.switchToServer();
            }

            if (!store.isSupport && self.isRunning) {
                // 获取最新消息并存储
                var msg = get(self.jobMsgKey);
                if (self.jobMsg !== msg) {
                    self.jobMsg = msg;
                    self.fire('changeCallBack', JSON.parse(msg));
                }
            }
        }, this.serverTimeout / 2);

        self._run();
        self.inited = true;
        return this;
    };

    /**
     * 停止任务,注意由于异步任务的存在，无法立即停止任务
     */
    Task.prototype.stop = function() {
        var self = this;
        self.isRunning = false;
        self.switchToClient();
        clearInterval(self.serverCheckInterval);
        return this;
    };

    /**
     * 关闭任务，以后不再使用
     */
    Task.prototype.cancel = function() {
        // 清楚记录
        // 但是有可能client切换成server之前被关闭，所以不能保证完全清除掉存储数据
        if (this.isServer) {
            remove(this.name);
            remove(this.serverTimeKey);
            remove(this.jobMsgKey);
        }
        // 清楚定时器
        clearInterval(this.timeUpdateInterval);
        clearTimeout(this.jobRunInterval);
        clearInterval(this.serverCheckInterval);
        return this;
    };

    /**
     * 查询设置isServer的状态值
     */
    Task.prototype.check = function(nowServer) {
        var self = this;
        nowServer = nowServer || get(self.name);
        // 未设置
        if (!nowServer) {
            self.switchToServer();
            // 不是自己
        } else if (nowServer !== pageId) {
            self.isServer = false;
            // 是自己
        } else {
            self.isServer = true;
        }
        return this;
    };

    /**
     * 切换成为server，强制抢占
     */
    Task.prototype.switchToServer = function() {
        var self = this;
        if (self.isServer) {
            return this;
        }
        self.isServer = true;
        set(self.name, pageId);
        set(self.serverTimeKey, new Date().getTime());
        self.timeUpdateInterval = setInterval(function() {
            // 如果被别人抢占了
            if (get(self.name) !== pageId) {
                clearInterval(self.timeUpdateInterval);
                // 更新时间
            } else {
                set(self.serverTimeKey, new Date().getTime());
            }
        }, self.serverTimeout / 2);
        return this;
    };

    /*
     * 切换成为客户端
     */
    Task.prototype.switchToClient = function() {
        var self = this;
        if (!self.isServer) {
            return this;
        }
        self.isServer = false;
        remove(self.name);
        remove(self.serverTimeKey);
        clearInterval(self.timeUpdateInterval);
        return this;
    };

    // 是否使用cookie来传输数据，此时无法传大批量数据
    Task.prototype.useCookie = !store.isSupport;

    /*
     * 注册定时回调，此函数会在当前页面的任务运行而定时运行
     */
    Task.prototype.onChangeCallBack = function(callback) {
        this.on('changeCallBack', callback, this);
        return this;
    };

    /*
     * 注册任务返回数据更新时候的回调函数，此函数不会随着任务结束而定时运行
     */
    Task.prototype.onCallBack = function(callback) {
        this.on('callback', callback, this);
        return this;
    };

    return Task;
});
