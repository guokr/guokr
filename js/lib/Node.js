/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr    :true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, g_obj_id:true */
G.def('Node', function() {
    'use strict';
    if ( !Object.create ) {
        Object.create = function (o) {
            if (arguments.length > 1) {
                throw new Error('Object.create implementation only accepts the first parameter.');
            }
            function F() {}
            F.prototype = o;
            return new F();
        };
    }
    /**
     * 中间格式node节点的格式
     */
    function Node() {
        this.isNode = true;
        /*
        this.tagName = null;        // 标签名
        this.value = null;          // 值
        this._attrs = null;         // 属性map;
        this._parent = null;        // 父节点
        this._children = null;      // 子节点数组;
        */
    }
    Node.prototype.attr = function( key, value ) {
        this._attrs = this._attrs || {};
        if ( typeof value !== 'undefined' ) {
            this._attrs[key] = value;
            return this;
        } else {
            return this._attrs[key];
        }
    };
    Node.prototype.eachAttr = function( iterator, context ) {
        for(var key in this._attrs) {
            if( this._attrs.hasOwnProperty( key ) ) {
                iterator.call( context, this._attrs[key], key, this._attrs );
            }
        }
        return this;
    };
    Node.prototype.parent = function() {
        return this._parent;
    };
    Node.prototype.children = function() {
        // clone一个新的数组，避免对原子节点数组的修改
        return this._children ? this._children.slice(0) : [];
    };
    /**
     * 将指定的节点添加为当前节点的最后一个子节点
     * @param {object} node 被指定的节点
     */
    Node.prototype.append = function( node ) {
        if( node._parent ) {
            throw 'Append: node has parent，can‘t be appended again!';
        }
        this._children = this._children || [];
        node._parent = this;
        this._children.push( node );
        return this;
    };
    /**
     * 将指定的节点插入到当前节点子节点中的指定位置
     * @param {object} node 节点
     * @param {number} offset 位置
     * @param {object} 当前节点
     */
    Node.prototype.insertChild = function( node, offset ) {
        this._children = this._children || [];
        if ( offset < 0 || this._children.length > offset ) {
            throw 'InsertChild: Offset is out of range!';
        }
        this._children.splice( offset, 0, node );
        return this;
    };
    /**
     * 把当前节点作为指定节点的最后一个子元素，并将指定节点插入到当前节点的原位置
     * @param {object} node 节点
    Node.prototype.wrap = function( node ) {
        var oldParent = this._parent;
        if ( oldParent ) {
            var oldIndex = this.getIndex();
            this.detach();
            node.append( this );
            this.oldParent.insertChild( node, oldIndex );
        }
        return this;
    };
     */
    /**
     * 将当前的节点插入到指定节点的后面
     * @param {object} node 节点
     * @param {object} 当前节点
     */
    Node.prototype.insertAfter = function( node ) {
        if ( this._parent ) {
            throw 'InsertAfter: Node has a parent!';
        }
        if ( !node._parent ) {
            throw 'InsertAfter: Target node has no _parent';
        }
        node._parent.insertChild( node, node.getIndex()+1 );
        return this;
    };
    /**
     * 将当前的节点插入到指定节点的前面
     * @param {object} node 节点
     * @param {object} 当前节点
     */
    Node.prototype.insertBefore = function( node ) {
        if ( this._parent ) {
            throw 'InsertBefore: Node has a parent!';
        }
        if ( !node._parent ) {
            throw 'InsertBefore: Target node has no parent';
        }
        node._parent.insertChild( node, node.getIndex() );
        return this;
    };
    /**
     * 将当前节点从父节点中移除
     */
    Node.prototype.detach = function() {
        var index = this.getIndex();
        if ( !~index ) {
            return;
        }
        this._parent._children.splice( index, 1 );
        this._parent = null;
    };
    /**
     * 将当前节点的所有子节点移除
     */
    Node.prototype.detachChildren = function() {
        var children = this.children(),
            i = 0,
            l = children.length;
        if ( children.length ) {
            for( ; i<l; i++ ) {
                children[i].detach();
            }
        }
    };
    /**
     * 获取当前节点在父节点中的排位
     * @param {number} 排位,如果没有父节点则返回-1
     */
    Node.prototype.getIndex = function() {
        if ( !this._parent ) {
            return -1;
        }
        return this._parent.indexOf(this);
    };
    /**
     * 获取指定子节点在当前节点子节点中的排位
     * @param {object} node 指定节点
     * @return {number} 排位,不是其子节点则返回-1
     */
    Node.prototype.indexOf = function( node ) {
        if ( !this._children ) {
            return -1;
        }
        if ( this._children.indexOf ) {
            return this._children.indexOf( node );
        } else {
            for ( var i=0,l=this._children.length; i<l; i++ ) {
                if ( this._children[i] === node ) {
                    return this._children[i];
                }
            }
            return -1;
        }
    };
    /**
     * 返回同一个深度中的前一个节点
     * @param {object} 节点
     */
    Node.prototype.prev = function() {
        var prev = this.getIndex() - 1;
        if ( prev >= 0 ) {
            return this._parent._children[ prev ];
        }
    };
    /**
     * 返回同一个深度中的下一个节点
     * @param {object} 节点
     */
    Node.prototype.next = function() {
        var index = this.getIndex(),
            next = index + 1;
        if ( ~index && next < this._parent._children.length ) {
            return this._parent._children[ next ];
        }
    };
    /**
     * 返回当前节点的最后一个子节点
     * @return {object} 子节点
     */
    Node.prototype.lastChild = function() {
        return this._children && this._children[this._children.length-1];
    };
    /**
     * 返回当前节点的第一个子节点
     * @return {object} 子节点
     */
    Node.prototype.firstChild = function() {
        return this._children && this._children[0];
    };
    /**
     * 查找当前节点的祖先元素是否是指定的标签
     * @param {array/string} tagNames
     * @param {boolean} includeSelf 当前是否也需要判断
     * @return {object} 最先找到的符合的节点,没有找到则为空
     */
    Node.prototype.findAncestorByTagName = function( tagNames, includeSelf ) {
        var node = includeSelf ? this : this._parent;
        tagNames = typeof tagNames === 'string' ? [tagNames] : tagNames;
        while( node ) {
            if( ~$.inArray( node.tagName, tagNames ) ) {
                return node;
            }
            node = node._parent;
        }
    };
    /**
     * 克隆节点，如果是深度克隆则会拷贝上下节点的关系，即拷贝子节点！(注意循环引用)
     * @param {boolean} deep 是否是深度克隆
     * @return {object} 克隆得到的节点
     */
    Node.prototype.clone = function( deep ) {
        var n = new Node();
        n.tagName = this.tagName;
        n.value = this.value;
        if( this._attrs ) {
            n._attrs = {};
            this.eachAttr(function( v, k ) {
                n._attrs.k = v;
            });
        }
        if ( deep ) {
            var children = this.children(),
                i = 0,
                l = children.length;
            if ( children.length ) {
                for( ; i<l; i++ ) {
                    n.append( children[i].clone( deep ) );
                }
            }
        }
        return n;
    };
    /**
     * 判断一个节点是否其祖先节点的最下面的节点
     * @param {object} relative 祖先元素，默认为当前节点的父节点
     * @return {boolean} 
     */
    Node.prototype.isLast = function( relative ) {
        if ( relative ) {
            var node = this;
            do{
                if ( !node.isLast() ) {
                    return false;
                }
                node = node._parent;
            } while( node !== relative );
            return true;
        } else {
            var i = this.getIndex();
            if ( ~i ) {
                return i === this._parent._children.length - 1;
            } else {
                // 没有父节点，或不是父节点的子元素
                return true;
            }
        }
    };
    /**
     * 判断一个节点是否其祖先节点的最上面的节点
     * @param {object} relative 祖先元素，默认为当前节点的父节点
     * @return {boolean} 
     */
    Node.prototype.isFirst = function( relative ) {
        if ( relative ) {
            var node = this;
            do{
                if ( !node.isFirst() ) {
                    return false;
                }
                node = node._parent;
            } while( node !== relative );
            return true;
        } else {
            var i = this.getIndex();
            if ( ~i ) {
                return i === 0;
            } else {
                // 没有父节点，或不是父节点的子元素
                return true;
            }
        }
    };

    return Node;
});
