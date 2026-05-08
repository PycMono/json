/* @license MIT */
/* cloudflare-skip-minify */
'use strict';
/**
 * json-tool-descriptions.js
 * Simplified version - only FAQ interactions, SEO content now rendered server-side
 */

// FAQ accordion functionality
document.addEventListener('DOMContentLoaded', function() {
  var faqItems = document.querySelectorAll('.jt-faq-item');

  faqItems.forEach(function(item) {
    var question = item.querySelector('.jt-faq-question');
    if (question) {
      question.addEventListener('click', function() {
        item.classList.toggle('open');
      });
    }
  });

  console.log('[JT SEO] FAQ interactions loaded, SEO content rendered server-side');
});