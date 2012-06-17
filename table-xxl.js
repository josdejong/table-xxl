/**
 * TableXXL
 *
 * TableXXL is a JavaScript library for rendering big tables in a web page.
 * A browser can only render a limited amount of data. TableXXL lets the
 * browser only render the currently visible rows of the table, which remains
 * fast also for large amounts of data.
 *
 * @license
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * Copyright (C) 2012 Jos de Jong
 *
 * @author    Jos de Jong <wjosdejong@gmail.com>
 * @date      2012-06-17
 */


/**
 * @constructor TableXXL
 * @param {Element} container
 */
var TableXXL = function (container) {
    this.container = container;
    this.dom = {};

    // start and end index of the visible rows
    this.offset = 0;
    this.limit = 0;
    this.length = 0;

    this._createDom();

    this.setData([], {});
};

/**
 * Set data
 * @param {Array} data      an array with arrays or objects
 * @param {Object} options
 */
TableXXL.prototype.setData = function (data, options) {
    this.data = data || [];
    this.length = this.data.length;
    this.offset = 0;
    this.limit = 0;

    // cleanup old DOM
    this.dom.tbody.innerHTML = '';
    this.dom.rows = [];

    this.options = options || {};
    if (typeof(this.options.defaultHeight) != 'number') {
        this.options.defaultHeight = 24;
    }
    if (typeof(this.options.maxNum) != 'number') {
        this.options.maxNum = 100;
    }
    if (this.options.maxNum < 100) {
        this.options.maxNum = 100;
    }
    if (typeof(this.options.blockNum) != 'number') {
        this.options.blockNum = 10;
    }
    if (this.options.blockNum < 1) {
        this.options.blockNum = 1;
    }

    this.redraw();
};

/**
 * Create the dom of the table
 */
TableXXL.prototype._createDom = function () {
    if (!this.container) {
        throw 'No HTML container defined';
    }
    this.container.innerHTML = '';

    this.dom.topArea = document.createElement('div');
    this.dom.topArea.style.height  = '0px';
    this.container.appendChild(this.dom.topArea);

    this.dom.table = document.createElement('table');
    this.dom.tbody = document.createElement('tbody');
    this.dom.table.appendChild(this.dom.tbody);
    this.container.appendChild(this.dom.table);

    this.dom.bottomArea = document.createElement('div');
    this.dom.bottomArea.style.height  = '0px';
    this.container.appendChild(this.dom.bottomArea);

    var me = this;
    TableXXL.addEventListener(this.container, 'scroll', function () {
        me.redraw();
    });
};

/**
 * Create a row from given data
 * @param {String[]} data
 * @return {Element} domRow
 */
TableXXL.createRow = function (data) {
    var domRow = document.createElement('tr');

    for (var i = 0; i < data.length; i++) {
        var td = document.createElement('td');
        td.innerHTML = data[i];
        domRow.appendChild(td);
    }

    return domRow;
};

/**
 * Redraw the table for the current visible window
 */
TableXXL.prototype.redraw = function () {
    //var start = (new Date()).valueOf(); // TODO: cleanup

    if (!this.container) {
        throw new Error('No HTML container defined');
    }

    var data = this.data;
    var length = data.length;
    var defaultHeight = this.options.defaultHeight;
    var blockNum = this.options.blockNum;
    var blockHeight = blockNum * defaultHeight;
    var maxNum = this.options.maxNum;

    var offset = this.offset;
    var limit = this.limit;

    // Calculate the current visible window
    var windowTop = this.container.scrollTop; // TODO: check if supported in IE
    var windowBottom = windowTop + this.container.clientHeight;
    var i, j, row;

    // jump to completely new part of the data
    var contentTop = this.dom.table.offsetTop - this.dom.topArea.offsetTop;
    var contentBottom = this.dom.bottomArea.offsetTop - this.dom.topArea.offsetTop;
    if (contentBottom < windowTop || contentTop > windowBottom) {
        // TODO: optimize this method
        var oldOffset = offset;
        var oldLimit = limit;

        offset = Math.floor((windowTop - blockHeight) / defaultHeight);
        offset = Math.floor(offset / blockNum) * blockNum;
        if (offset >= length) {
            offset = length - 1;
        }
        if (offset < 0) {
            offset = 0;
        }
        limit = 0;
        // TODO: offset may not exceed data length?

        //console.log('jump from', oldOffset, oldLimit, ' to ', offset);

        // Adjust height of top and bottom areas
        this.dom.topArea.style.height = offset * defaultHeight + 'px';
        this.dom.bottomArea.style.height = (length - offset - limit) * defaultHeight + 'px';

        // remove all loaded rows
        i = oldOffset + oldLimit - 1;
        while (oldLimit > 0) {
            row = this.dom.rows[i];
            this.dom.tbody.removeChild(row);
            delete this.dom.rows[i];
            oldLimit--;
            i--;
        }

        contentTop = this.dom.table.offsetTop - this.dom.topArea.offsetTop;
        contentBottom = this.dom.bottomArea.offsetTop - this.dom.topArea.offsetTop;
    }

    // append rows to the end when needed
    i = offset + limit;
    while ((contentBottom < windowBottom + blockHeight) && i < length) {
        for (j = 0; j < blockNum; j++) {
            row = TableXXL.createRow(data[i]);
            this.dom.rows[i] = row;
            this.dom.tbody.appendChild(row);
            limit++;
            i++;
            contentBottom += defaultHeight;
        }
    }

    // remove rows from the start when too many
    while (limit > maxNum) {
        row = this.dom.rows[offset];
        this.dom.tbody.removeChild(row);
        delete this.dom.rows[offset];

        limit--;
        offset++;
    }

    // append rows to the start when needed
    while ((contentTop > windowTop - blockHeight) && offset > 0) {
        for (j = 0; j < blockNum; j++) {
            offset--;
            limit++;
            contentTop -= defaultHeight;

            row = TableXXL.createRow(data[offset]);
            this.dom.rows[offset] = row;
            this.dom.tbody.insertBefore(row, this.dom.tbody.firstChild);
        }
    }

    // remove rows from the end when too many
    i = offset + limit - 1;
    while (limit > maxNum) {
        row = this.dom.rows[i];
        this.dom.tbody.removeChild(row);
        delete this.dom.rows[i];

        limit--;
        i--;
    }

    // Adjust height of top and bottom areas
    this.dom.topArea.style.height = offset * defaultHeight + 'px';
    this.dom.bottomArea.style.height = (length - offset - limit) * defaultHeight + 'px';

    this.offset = offset;
    this.limit = limit;

    //var end = (new Date()).valueOf(); // TODO: cleanup
    //console.log('redraw time:', (end-start), 'ms', "start:", this.offset, "end:", this.offset+this.limit-1);
};

/**
 * Add and event listener. Works for all browsers
 * @param {Element} element    An html element
 * @param {string}      action     The action, for example 'click',
 *                                 without the prefix 'on'
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     useCapture
 */
TableXXL.addEventListener = function (element, action, listener, useCapture) {
    if (element.addEventListener) {
        if (useCapture === undefined) {
            useCapture = false;
        }

        if (action === 'mousewheel' && navigator.userAgent.indexOf('Firefox') >= 0) {
            action = 'DOMMouseScroll';  // For Firefox
        }

        element.addEventListener(action, listener, useCapture);
    } else {
        element.attachEvent('on' + action, listener);  // IE browsers
    }
};

