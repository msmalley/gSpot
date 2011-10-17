<?php

$markers = array();

$markers[0]['lat'] = 3.152864;
$markers[0]['lng'] = 101.712624;
$markers[0]['title'] = 'gSpot - AJAX Example';
$markers[0]['content'] = '<a href="https://github.com/msmalley/gSpot">gSpot</a> also features the ability to collect AJAX markers from a defined location.<br />As simple as:<br /><code>&lt;div id="gspot-bottom-right" data-ajax="json.php"&gt&lt/div&gt</code>';
$markers[0]['this_id'] = 'a1';
$markers[0]['slug'] = 'https://github.com/msmalley/gSpot';
$markers[0]['open'] = true;

$markers[1]['lat'] = 3.1;
$markers[1]['lng'] = 101;
$markers[1]['title'] = 'Another AJAX Example';
$markers[1]['content'] = '<a href="https://github.com/msmalley/gSpot">gSpot</a> also features the ability to collect AJAX markers from a defined location.<br />As simple as:<br /><code>&lt;div id="gspot-bottom-right" data-ajax="json.php"&gt&lt/div&gt</code>';
$markers[1]['this_id'] = 'a2';
$markers[1]['slug'] = 'https://github.com/msmalley/gSpot';
$markers[1]['open'] = false;

$markers[2]['lat'] = 3;
$markers[2]['lng'] = 100;
$markers[2]['title'] = 'gSpot - AJAX Example Explained';
$markers[2]['content'] = '<a href="https://github.com/msmalley/gSpot">gSpot</a> also features the ability to collect AJAX markers from a defined location.<br />As simple as:<br /><code>&lt;div id="gspot-bottom-right" data-ajax="json.php"&gt&lt/div&gt</code>';
$markers[2]['this_id'] = 'a1';
$markers[2]['slug'] = 'https://github.com/msmalley/gSpot';
$markers[2]['open'] = false;

echo json_encode($markers);