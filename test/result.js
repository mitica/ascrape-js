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

describe('result', function() {
	it('should get document', function(done) {
		var url = 'http://www.whitehouse.gov/';
		nock(url)
			.get('/')
			.reply(200, file('whitehouse.html'), {
				'Content-Type': 'text/html'
			});
		read(url, function(err, result) {
			result.title.should.equal('The White House');
			done();
		});
	});

	it('should not read style:none blocks', function(done) {
		var url = 'http://zaol.hu/kulfold';
		var page = '/megrongaltak-petofi-sandor-szobrat-ungvaron-1720762';
		nock(url)
			.get(page)
			.reply(200, file('zaol.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			result.content.text().length.should.be.aboveOrEqual(1240);
			// console.log(result.content.html());
			done();
		});
	});

	it('should NOT work for text nodes', function(done) {
		var url = 'https://tools.ietf.org/html';
		var page = '/rfc2822';
		nock(url)
			.get(page)
			.reply(200, file('ietf.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			// console.log(result.title);
			// console.log('------------------');
			// console.log(result.content.text());
			result.content.should.equal(false);
			done();
		});
	});

	it('should work', function(done) {
		var url = 'http://www.wprost.pl/ar/516408/w-polsce-najwiecej-wydaja-turysci-amerykanscy-ale-najwiecej-jest-niemieckich/';
		nock(url)
			.get('/')
			.reply(200, file('wprost.html'), {
				'Content-Type': 'text/html'
			});
		read(url, function(err, result) {
			// console.log(result.title);
			// console.log('------------------');
			// console.log(result.content.text());
			result.content.text().trim().should.startWith('W zeszłym roku Polskę');
			done();
		});
	});
});
