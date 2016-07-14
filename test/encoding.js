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

describe('encoding', function() {
	it('iso-8859-2', function(done) {
		var url = 'http://www.wprost.pl/ar/516408/w-polsce-najwiecej-wydaja-turysci-amerykanscy-ale-najwiecej-jest-niemieckich/';
		nock(url)
			.get('/')
			.reply(200, file('wprost.html'), {
				'Content-Type': 'text/html'
			});
		read(url, function(err, result) {
			result.title.should.equal('W Polsce najwięcej wydają turyści amerykańscy, ale najwięcej jest niemieckich');
			// console.log(result.content.text());
			result.content.text().length.should.be.aboveOrEqual(809);
			done();
		});
	});

	it('iso-8859-2', function(done) {
		var url = 'http://manager.money.pl/news/artykul';
		var page = '/analiza-stron-www-blink-pl-opracowal,29,0,1880861.html';
		nock(url)
			.get(page)
			.reply(200, file('manager-money.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			result.content.text().length.should.be.aboveOrEqual(2800);
			result.title.should.equal('Analiza stron www. Blink.pl opracował innowacyjne narzędzie');
			done();
		});
	});

	it('iso-8859-2', function(done) {
		var url = 'http://www.ma.hu/kulfold/257899';
		var page = '/Ujabb_robbanasok_tortentek_Tiencsinben';
		nock(url)
			.get(page)
			.reply(200, file('ma-hu.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			result.title.should.equal('Újabb robbanások történtek Tiencsinben');
			// console.log(result.content.text());
			result.content.text().length.should.be.aboveOrEqual(860);
			done();
		});
	});

	it('windows-1251', function(done) {
		var url = 'http://dariknews.bg';
		var page = '/view_article.php?article_id=1484195';
		nock(url)
			.get(page)
			.reply(200, file('dariknews.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			result.title.should.equal('Борисов: Тече акция, хванали сме над 100 тона гориво без документи');
			// console.log(result.content.text());
			result.content.text().length.should.be.aboveOrEqual(1375);
			done();
		});
	});

	it('windows-1251', function(done) {
		var url = 'http://www.gazeta.ru/business/2015/08/14';
		var page = '/7688218.shtml';
		nock(url)
			.get(page)
			.reply(200, file('gazeta.html'), {
				'Content-Type': 'text/html'
			});
		read(url + page, function(err, result) {
			result.title.should.equal('Как платить кредиты «покойным» банкам');
			// console.log(result.content.text());
			result.content.text().length.should.be.aboveOrEqual(4138);
			done();
		});
	});
});
