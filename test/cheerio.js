/*eslint handle-callback-err:0*/
'use strict';

var read = require('../lib/index');
var cheerio = require('cheerio');

describe('cheerio', function() {
	it('should accept cheerio object', function(done) {
		var $ = cheerio.load('<html><body>Some text</body></html>');
		read($, function(err, result) {
			result.title.should.equal('');
			result.content.should.equal(false);
			done();
		});
	});
});
