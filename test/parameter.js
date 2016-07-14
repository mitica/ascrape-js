/*eslint handle-callback-err:0*/
'use strict';

var fs = require('fs');
var path = require('path');
/*eslint no-unused-vars:0*/
var should = require('should');
var nock = require('nock');
var read = require('../lib/index');

var file = function(filename) {
	return fs.readFileSync(path.join(__dirname, 'fixtures', filename));
};

describe('parameters', function() {

	describe('options', function() {
		it('should pass the options to request lib', function(done) {
			var url = 'http://dribbble.com/';
			var dribbble = nock(url)
				.post('/')
				.reply(200, '<body>dribbble</body>', {
					'Content-Type': 'text/html'
				});
			read(url, {
				method: 'POST'
			}, function(err, result) {
				should.exists(result);
				dribbble.isDone().should.equal(true);
				done();
			});
		});
	});

	describe('preprocess', function() {
		it('should preprocess document', function(done) {
			var url = 'http://colorlines.com/archives/2011/08';
			var page = '/dispatch_from_angola_faith-based_slavery_in_a_louisiana_prison.html';
			nock(url)
				.get(page)
				.reply(200, file('colorlines.html'), {
					'Content-Type': 'text/html'
				});
			read(url + page, {
					preprocess: function(source, response, contentType, callback) {
						should.exist(source);
						// source.length.should.equal(50734);
						should.exist(response);
						should.exist(response.headers);
						should.exist(contentType);
						should.exist(contentType.charset);
						callback(null, '<html><head><title>some other title</title></head><body></body></html>');
					}
				},
				function(err, result) {
					should.not.exist(err);
					should.exist(result);
					result.title.should.equal('some other title');
					result.content.should.equal(false);
					done();
				});
		});

		it('should stop processing document', function(done) {
			var url = 'http://www.whitehouse.gov/';
			nock(url)
				.get('/')
				.reply(200, file('whitehouse.html'), {
					'Content-Type': 'text/html'
				});
			read(url, {
				preprocess: function(source, response, contentType, callback) {
					should.exist(source);
					// source.length.should.equal(71002);
					should.exist(response);
					should.exist(response.headers);
					should.exist(contentType);
					should.exist(contentType.charset);
					callback(new Error('stop'));
				}
			}, function(err, result) {
				should.not.exist(result);
				should.exist(err);
				err.message.should.equal('stop');
				done();
			});
		});

	});
});
