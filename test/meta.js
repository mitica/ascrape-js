/*eslint handle-callback-err:0*/
'use strict';

var fs = require('fs');
var path = require('path');
/*eslint no-unused-vars:0*/
var should = require('should');
var read = require('../lib/index');

var filePath = path.join(__dirname, 'fixtures', 'test.html');

describe('meta', function() {
	it('should get excerpt if provided as description meta', function(done) {
		fs.readFile(filePath, {
			encoding: 'utf-8'
		}, function(err, html) {
			read(html, function(readError, result) {
				result.excerpt.should.equal('新浪科技讯北京时间1月16日凌晨消息，据彭博社报道，过去两年时间里谷歌为收购硬件、软件和广告技术公司而花费的资金总额已达170亿美元，比苹果公司、微软、亚马逊、Facebook和雅虎用于并购交易的投资总额还要高，这五家公司总共才投入了130');
				done();
			});
		});
	});

	it('should get title from meta og:title if set', function(done) {
		fs.readFile(filePath, {
			encoding: 'utf-8'
		}, function(err, html) {
			read(html, function(readError, result) {
				result.title.should.equal('谷歌两年花170亿美元并购 超五大公司总和');
				done();
			});
		});
	});
});
