'use strict';

// All of the regular expressions in use within readability.
var OPTIONS = {
	// unlikelyCandidatesRe: /combx|modal|lightbox|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor|social|teaserlist|time|tweet|twitter/i,
	unlikelyCandidatesClasses: '.combx,.modal,.lightbox,.comment,.disqus,.foot,.footer,.header,.menu,.meta,.nav,.rss,.shoutbox,.sidebar,.sponsor,.social,.teaserlist,.time,.tweet,.twitter',
	unlikelyCandidatesIds: '#combx,#modal,#lightbox,#comment,#disqus,#foot,#footer,#header,#menu,#meta,#nav,#rss,#shoutbox,#sidebar,#sponsor,#social,#teaserlist,#time,#tweet,#twitter',
	// okMaybeItsACandidateRe: /and|article|body|column|main/i,
	positiveRe: /article|body|content|entry|hentry|page|pagination|post|text/i,
	negativeRe: /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|utility|tags|widget/i,
	// divToPElementsRe: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
	divToPElements: 'a,blockquote,dl,div,img,ol,p,pre,table,ul',
	// replaceBrsRe: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
	// replaceFontsRe: /<(\/?)font[^>]*>/gi,
	trimRe: /^\s+|\s+$/g,
	normalizeRe: /\s{2,}/g,
	// killBreaksRe: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
	// videoRe: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|56|yinyuetai)\.com/i,
	invalidElements: 'script,style,footer,menu,nav,center,ins,iframe,form,object,.comment-count,.fb-comments,.close'
};

var dbg;
exports.debug = function(debug) {
	dbg = (debug) ? console.log : function() {};
};

function randomString() {
	return Math.random().toString(36).slice(2);
}

function getElementId(node) {
	return node.attr('readability-id');
}

function setElementId(node) {
	var id = getElementId(node) || randomString();
	node.attr('readability-id', id);
	return id;
}

function getContentScore(node) {
	var score = node.attr('readability-score');
	return [null, undefined].indexOf(score) === -1 ? parseFloat(score) : 0;
}

function setContentScore(node, count) {
	node.attr('readability-score', count.toString().replace(/[ ,]/g, '.'));
}

function addContentScore(node, count) {
	setContentScore(node, getContentScore(node) + count);
}


/**
 * Remove the style attribute on every e and under.
 *
 * @param Element
 * @return void
 **/
function cleanStyles($, node) {
	if (!node) {
		return;
	}


	node.removeAttr('style');
	$('*', node).removeAttr('style');
}

// /**
//  * Remove extraneous break tags from a node.
//  *
//  * @param Element
//  * @return void
//  **/
// function killBreaks(e) {
// 	e.innerHTML = e.innerHTML.replace(regexps.killBreaksRe, '<br />');
// }


/**
 * Get the inner text of a node - cross browser compatibly.
 * This also strips out any excess whitespace to be found.
 *
 * @param Element
 * @return string
 **/
var getInnerText = exports.getInnerText = function(e, normalizeSpaces) {
	var textContent = '';

	normalizeSpaces = (typeof normalizeSpaces === 'undefined') ? true : normalizeSpaces;

	textContent = e.text().trim();

	return normalizeSpaces ? textContent.replace(OPTIONS.normalizeRe, ' ') : textContent;
};

/**
 * Get the number of times a string s appears in the node e.
 *
 * @param Element
 * @param string - what to split on. Default is ","
 * @return number (integer)
 **/
function getCharCount(node, s) {
	s = s || ',';
	return getInnerText(node).split(s).length;
}

/**
 * Get the density of links as a percentage of the content
 * This is the amount of text that is inside a link divided by the total text in the node.
 *
 * @param Element
 * @return number (float)
 **/
function getLinkDensity($, node) {
	var links = $('a', node);

	var textLength = getInnerText(node).length;
	var linkLength = 0;
	links.each(function(i, link) {
		link = $(link);
		var href = link.attr('href');
		// hack for <h2><a href="#menu"></a></h2> / <h2><a></a></h2>
		if (!href || (href.length > 0 && href[0] === '#')) {
			return;
		}
		linkLength += getInnerText(link).length;
	});
	return linkLength / textLength;
}

/**
 * Get an elements class/id weight. Uses regular expressions to tell if this
 * element looks good or bad.
 *
 * @param Element
 * @return number (Integer)
 **/
function getClassWeight(node) {
	var weight = 0;
	var className = node.attr('class');
	var id = node.attr('id');
	/* Look for a special classname */
	if (className) {
		if (className.search(OPTIONS.negativeRe) !== -1) {
			weight -= 25;
		}

		if (className.search(OPTIONS.positiveRe) !== -1) {
			weight += 25;
		}
	}

	/* Look for a special ID */
	if (typeof id === 'string' && id !== '') {
		if (id.search(OPTIONS.negativeRe) !== -1) {
			weight -= 25;
		}

		if (id.search(OPTIONS.positiveRe) !== -1) {
			weight += 25;
		}
	}

	return weight;
}

/**
 * Clean an element of all tags of type "tag" if they look fishy.
 * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
 *
 * @return void
 **/
function cleanConditionally($, node, tag) {
	var tagsList = $(tag, node);

	/**
	 * Gather counts for other typical elements embedded within.
	 * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
	 *
	 * TODO: Consider taking into account original contentScore here.
	 **/
	tagsList.each(function() {
		var el = $(this);
		var weight = getClassWeight(el);

		dbg('Cleaning Conditionally ' + el[0].name + ' (' + el.attr('class') + ':' + el.attr('id') + ')' + (' with score ' + getContentScore(el)));

		if (weight < 0) {
			el.remove();
		} else if (getCharCount(el, ',') < 10) {
			/**
			 * If there are not very many commas, and the number of
			 * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
			 **/

			var p = $('p', el).length;
			var img = $('img', el).length;
			var li = $('li', el).length - 100;
			var input = $('input', el).length;

			// var embedCount = 0;
			// var embeds = $('embed', el);;
			// for (var ei = 0, il = embeds.length; ei < il; ei++) {
			// 	if (embeds[ei].src && embeds[ei].src.search(regexps.videoRe) == -1) {
			// 		embedCount++;
			// 	}
			// }

			var linkDensity = getLinkDensity($, el);
			var contentLength = getInnerText(el).length;
			var toRemove = false;

			if (img > p && img > 1) {
				toRemove = true;
			} else if (li > p && tag !== 'ul' && tag !== 'ol') {
				toRemove = true;
			} else if (input > Math.floor(p / 3)) {
				toRemove = true;
			} else if (contentLength < 25 && (img === 0 || img > 2)) {
				toRemove = true;
			} else if (weight < 25 && linkDensity > .2) {
				toRemove = true;
			} else if (weight >= 25 && linkDensity > .5) {
				toRemove = true;
			}
			// else if ((embedCount == 1 && contentLength < 75) || embedCount > 1) {
			// 	toRemove = true;
			// }

			if (toRemove) {
				// console.log('remove', el);
				el.remove();
			}
		}
	});
}

/**
 * Clean out spurious headers from an Element. Checks things like classnames and link density.
 *
 * @param Element
 * @return void
 **/
function cleanHeaders($, node) {
	function process() {
		var h = $(this);
		if (getClassWeight(h) < 0 || getLinkDensity($, h) > 0.33) {
			h.remove();
		}
	}

	for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
		var headers = $('h' + headerIndex, node);
		headers.each(process);
	}
}

/**
 * Remove the header that doesn't have next sibling.
 *
 * @param Element
 * @return void
 **/

function cleanSingleHeader($, node) {
	function process() {
		var h = $(this);
		if (h.children().length === 0) {
			h.remove();
		}
	}
	for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
		var headers = $('h' + headerIndex, node);
		headers.each(process);
	}

}

function prepArticle($, articleContent) {
	cleanStyles($, articleContent);
	// killBreaks(articleContent);

	/* Clean out junk from the article content */
	var el = $('h1', articleContent);
	if (el.length === 1) {
		el.remove();
	}
	/**
	 * If there is only one h2, they are probably using it
	 * as a header and not a subheader, so remove it since we already have a header.
	 ***/
	el = $('h2', articleContent);
	if (el.length === 1) {
		el.remove();
	}

	cleanHeaders($, articleContent);

	/* Do these last as the previous stuff may have removed junk that will affect these */
	cleanConditionally($, articleContent, 'table');
	cleanConditionally($, articleContent, 'ul');
	cleanConditionally($, articleContent, 'div');

	/* Remove extra paragraphs */
	$('p', articleContent).each(function() {
		var p = $(this);
		var imgCount = $('img', p).length;
		var embedCount = $('embed', p).length;
		var objectCount = $('object', p).length;

		if (imgCount === 0 && embedCount === 0 && objectCount === 0 && getInnerText(p, false) === '') {
			p.remove();
		}
	});

	cleanSingleHeader($, articleContent);

	// try {
	// 	articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');
	// } catch (e) {
	// 	dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.");
	// }

	// fixLinks($, articleContent);
}

/**
 * Initialize a node with the readability object. Also checks the
 * className/id for special names to add to its score.
 *
 * @param Element
 * @return void
 **/
function initializeNode(node) {
	node.readability = true;
	setElementId(node);
	switch (node[0].name.toUpperCase()) {
		case 'ARTICLE':
			addContentScore(node, 10);
			break;

		case 'SECTION':
			addContentScore(node, 8);
			break;

		case 'DIV':
			addContentScore(node, 5);
			break;

		case 'PRE':
		case 'TD':
		case 'BLOCKQUOTE':
			addContentScore(node, 3);
			break;

		case 'ADDRESS':
		case 'OL':
		case 'UL':
		case 'DL':
		case 'DD':
		case 'DT':
		case 'LI':
		case 'FORM':
			addContentScore(node, -3);
			break;

		case 'H1':
		case 'H2':
		case 'H3':
		case 'H4':
		case 'H5':
		case 'H6':
		case 'TH':
			addContentScore(node, -5);
			break;
	}

	if (node.is('[itemscope]')) {
		addContentScore(node, 5);
		if (node.attr('itemtype') &&
			/blog|post|article/i.test(node.attr('itemtype'))) {
			addContentScore(node, 30);
		}
	}

	addContentScore(node, getClassWeight(node));
}

function isValidElement(element) {
	return (element.css('display') !== 'none');
}


module.exports.grabTitle = function grabTitle($) {
	var title = $('title', 'head').text() || '';
	var betterTitle;
	var commonSeparatingCharacters = [' | ', ' _ ', ' - ', '«', '»', '—'];

	commonSeparatingCharacters.forEach(function(char) {
		if (betterTitle) {
			return title;
		}
		var tmpArray = title.split(char);
		if (tmpArray.length > 1) {
			betterTitle = tmpArray[0].trim();
		}
	});

	if (betterTitle && betterTitle.length > 10) {
		return betterTitle;
	}

	return title;
};

module.exports.grabMeta = function grabMeta($) {
	var metadata = {};
	var values = {};

	// Match "description", or Twitter's "twitter:description" (Cards)
	// in name attribute.
	var namePattern = /^\s*((twitter)\s*:\s*)?(description|title)\s*$/gi;

	// Match Facebook's Open Graph title & description properties.
	var propertyPattern = /^\s*og\s*:\s*(description|title)\s*$/gi;

	$('meta').each(function () {
		var meta = $(this);
		var elementName = meta.attr('name');
		var elementProperty = meta.attr('property');

		var name = null;
		if (namePattern.test(elementName)) {
			name = elementName;
		} else if (propertyPattern.test(elementProperty)) {
			name = elementProperty;
		}

		if (name) {
			var content = meta.attr('content');
			if (content) {
				// Convert to lowercase and remove any whitespace
				// so we can match below.
				name = name.toLowerCase().replace(/\s/g, '');
				values[name] = content.trim();
			}
		}
	});

	if ('description' in values) {
		metadata.excerpt = values.description;
	} else if ('og:description' in values) {
		// Use facebook open graph description.
		metadata.excerpt = values['og:description'];
	} else if ('twitter:description' in values) {
		// Use twitter cards description.
		metadata.excerpt = values['twitter:description'];
	}

	if ('og:title' in values) {
		// Use facebook open graph title.
		metadata.title = values['og:title'];
	} else if ('twitter:title' in values) {
		// Use twitter cards title.
		metadata.title = values['twitter:title'];
	}

	return metadata;
};

/***
 * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
 *               most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
 *
 * @return Element
 **/
module.exports.grabArticle = function grabArticle($, options) {
	options = options || {};
	/**
	 * First, node prepping. Trash nodes that look cruddy (like ones with the class name "comment", etc), and turn divs
	 * into P tags where they have been used inappropriately (as in, where they contain no other block level elements.)
	 *
	 * Note: Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
	 * TODO: Shouldn't this be a reverse traversal?
	 **/

	$(OPTIONS.invalidElements).remove();

	// Remove unlikely candidates */
	if (!options.preserveUnlikelyCandidates) {
		$(OPTIONS.unlikelyCandidatesIds + ',' + OPTIONS.unlikelyCandidatesClasses).remove();
	}

	// Turn all divs that don't have children block level elements into p's
	$('div').each(function() {
		var element = $(this);
		if (!isValidElement(element)) {
			element.remove();
			return;
		}
		if ($(OPTIONS.divToPElements, element).length === 0) {
			var p = $('<p>' + element.html() + '</p>');
			p.attr('class', element.attr('class'));
			p.attr('id', element.attr('id'));
			element.replaceWith(p);
		} else {
			// EXPERIMENTAL
			// element.contents().each(function() {
			// 	var childNode = $(this);
			// 	if (childNode[0].type === 'text') {
			// 		// use span instead of p. Need more tests.
			// 		dbg("replacing text node with a span tag with the same content.");
			// 		var span = $('<span>' + childNode[0].data + '</span>');
			// 		childNode.replaceWith(span);
			// 	}
			// });
			// console.log('element content: ', element.html());
		}
	});


	/**
	 * Loop through all paragraphs, and assign a score to them based on how content-y they look.
	 * Then add their score to their parent node.
	 *
	 * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
	 **/
	var candidates = [];
	$('p').each(function(i, paragraph) {
		// console.log(paragraph);
		paragraph = $(paragraph);
		if (!isValidElement(paragraph)) {
			paragraph.remove();
			return;
		}
		var parent = paragraph.parent();
		var grandParent = parent.parent();
		if (!isValidElement(parent)) {
			parent.remove();
			return;
		}
		var innerText = getInnerText(paragraph);
		// If this paragraph is less than 25 characters, don't even count it.
		if (innerText.length < 25) {
			// console.log('too small', innerText, paragraph.html());
			return;
		}
		// console.log('innerText', innerText);
		// Initialize readability data for the parent.
		if (!getElementId(parent)) {
			initializeNode(parent);
			candidates.push(parent);
		}
		// Initialize readability data for the grandparent.
		if (!getElementId(grandParent)) {
			initializeNode(grandParent);
			candidates.push(grandParent);
		}

		var contentScore = 0;

		// Add a point for the paragraph itself as a base. */
		++contentScore;

		// Add points for any commas within this paragraph */
		contentScore += innerText.replace('，', ',').split(',').length;

		// For every 100 characters in this paragraph, add another point. Up to 3 points. */
		contentScore += Math.min(Math.floor(innerText.length / 100), 3);
		// console.log(contentScore);
		// Add the score to the parent. The grandparent gets half. */
		addContentScore(parent, contentScore);
		addContentScore(grandParent, contentScore / 2);
	});

	/**
	 * After we've calculated scores, loop through all of the possible candidate nodes we found
	 * and find the one with the highest score.
	 **/
	var topCandidate = null;
	candidates.forEach(function(candidate) {
		/**
		 * Scale the final candidates score based on link density. Good content should have a
		 * relatively small link density (5% or less) and be mostly unaffected by this operation.
		 **/
		setContentScore(candidate, getContentScore(candidate) * (1 - getLinkDensity($, candidate)));

		dbg('Candidate: ' + candidate[0].name + ' (' + candidate.attr('class') + ':' + candidate.attr('id') + ') with score ' + getContentScore(candidate));

		if (!topCandidate || getContentScore(candidate) > getContentScore(topCandidate)) {
			topCandidate = candidate;
		}
	});

	if (!topCandidate) {
		return null;
	}

	/**
	 * Now that we have the top candidate, look through its siblings for content that might also be related.
	 * Things like preambles, content split by ads that we removed, etc.
	 **/
	var articleContent = $('<div id="readability-content"></div>');

	var siblingScoreThreshold = Math.max(10, getContentScore(topCandidate) * 0.2);
	/**
	 * Find only article body or all page main content: header, footer, etc.
	 */
	var siblingNodes = topCandidate.children();
	siblingNodes.each(function(e, node) {
		node = $(node);
		var append = false;


		// dbg('Looking at sibling node: ' + siblingNode + ' (' + siblingNode.className + ':' + siblingNode.id + ')' + ((typeof siblingNode.readability != 'undefined') ? (' with score ' + siblingNode.readability.contentScore) : ''));
		// dbg('Sibling has score ' + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

		if (getContentScore(node) >= siblingScoreThreshold) {
			append = true;
		}

		if (node[0].name === 'p') {
			var linkDensity = getLinkDensity($, node);
			var nodeContent = getInnerText(node);
			var nodeLength = nodeContent.length;

			if (nodeLength > 80 && linkDensity < 0.25) {
				append = true;
			} else if (nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
				append = true;
			}
		}

		if (append) {
			dbg('Appending node: ' + node);

			/* Append sibling and subtract from our list because it removes the node when you append to another node */
			articleContent.append(node);
		}
	});

	/**
	 * So we have all of the content that we need. Now we clean it up for presentation.
	 **/
	prepArticle($, articleContent);

	return articleContent;
};
