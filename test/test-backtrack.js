//if (typeof window === "undefined")
//    var $ = require('jquery')(require("jsdom").jsdom().parentWindow);

var assert = require('chai').assert;
var backtracker = require('../src/backtrack.js');

var x = 1;
var y = 2;
var directionCode =  {north: 0, east: 1, south: 2, west: 3};
var model;

describe('BACKTRACK TESTS', function() {
	describe('root tree upon constructed', function() {
		before(function() {
			model = new backtracker.model();
		});
		it("is null", function() {
			assert.equal(model.tree, null);
		});
	});
	describe('backtrack.setRoot()', function() {
		describe('when assigned to '+x+', '+y, function() {
			before(function() {
				model.setRoot(x, y);
			});
			it("x component is "+x, function () {
				assert.equal(model.pointer.pos[0], x);
			});
			it("y component is "+y, function () {
				assert.equal(model.pointer.pos[1], y);
			});
		});
		describe('when assigned to 2,3', function() {
			before(function() {
				model.setRoot(2, 3);
			});
			it("x component should be "+x, function () {
				assert.equal(model.pointer.pos[0], x);
			});
			it("y component should be "+y, function () {
				assert.equal(model.pointer.pos[1], y);
			});
		});
	});
	describe("backtrack.onTrack()", function() {
		describe("move cursor to 5,5", function() {
			before(function(){
				model.onTrack(5,5);
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], x);
				assert.equal(model.pointer.pos[1], y);
			});
			it("should not cacluate currentDir", function(){
				assert.equal(model.currentDir, -1);
			});
		});
		describe("move cursor to 1,2", function() {
			before(function(){
				model.onTrack(1,2);
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], x);
				assert.equal(model.pointer.pos[1], y);
			});
			it("should not calculate currentDir", function(){
				assert.equal(model.currentDir, -1);
			});
		});
		describe("move cursor to 3,2", function() {
			before(function(){
				model.onTrack(x+2,2);
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], x);
				assert.equal(model.pointer.pos[1], y);
			});
			it("should change lastX to 3", function() {
				assert.equal(model.lastX, 3);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, 2);
			});
			it("Curent direction should be east", function(){
				assert.equal(model.currentDir, directionCode.east);
			});
		});
		describe("move cursor to 5,2 ", function(){
			it("onTrack(5,2) should return false", function() {
				assert.isFalse(model.onTrack(5,2));
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], x);
				assert.equal(model.pointer.pos[1], y);
			});
			it("should change lastX to 5", function() {
				assert.equal(model.lastX, 5);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, 2);
			});
			it("Current direction should be east", function(){
				assert.equal(model.currentDir, directionCode.east);
			});
		});
		describe("move cursor down y++", function(){
			before(function() {
				model.onTrack(x = 5, ++y);
			});
			it("should add new node at 5,2.", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 2);
			});
			it("should not change lastX", function() {
				assert.equal(model.lastX, 5);
			});
			it("should change lastY to 3", function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction should be south", function(){
				assert.equal(model.currentDir, directionCode.south);
			});
			it("Node pointer should be west", function(){
				assert.equal(model.pointer.direction, directionCode.west);
			});
		});
		describe("move cursor x-- ", function() {
			before(function(){
				model.onTrack(--x,y);
			});
			it("should add a new node at 5,3", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 3);
			});
			it("should change lastX to 4", function() {
				assert.equal(model.lastX, x);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction should be west", function(){
				assert.equal(model.currentDir, directionCode.west);
			});
			it("Backtrack direction should be east", function() {
				assert.equal(model.backtrackDir, directionCode.east);
			});
			it("Node pointer should be north", function(){
				assert.equal(model.pointer.direction, directionCode.north);
			});
		});
		describe("move cursor x-- again ", function() {
			before(function(){
				model.onTrack(--x,y);
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 3);
			});
			it("should change lastX to "+x, function() {
				assert.equal(model.lastX, x);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, y);
			});
			it("should not change current direction", function(){
				assert.equal(model.currentDir, directionCode.west);
			});
			it("should not change backtrack direction", function() {
				assert.equal(model.backtrackDir, directionCode.east);
			});
		});
		describe("backtrack on x and move x++", function(){
			it("onTrack() should be true", function() {
				assert.isTrue(model.onTrack(++x,y));
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 3);
			});
			it("should change lastX to "+x, function() {
				assert.equal(model.lastX, x);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, y);
			});
			it("should change current direction to east", function(){
				assert.equal(model.currentDir, directionCode.east);
			});
			it("should not change backtrack direction", function() {
				assert.equal(model.backtrackDir, directionCode.east);
			});
			it("No node should be visited", function(){
				assert.isFalse(model.nodeRevisited);
			});
		});
		describe("backtrack on x and move x++ again", function(){
			it("onTrack() should be true", function() {
				assert.isTrue(model.onTrack(++x,y));
			});
			it("should not add new node", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 3);
			});
			it("should chnage lastX to "+x, function() {
				assert.equal(model.lastX, x);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction is east", function(){
				assert.equal(model.currentDir, directionCode.east);
			});
			it("Backtrack direction should be north", function() {
				assert.equal(model.backtrackDir, directionCode.north);
			});
			it("A node should be visited", function(){
				assert.isTrue(model.nodeRevisited);
			});
		});
		describe("backtrack on x and move y--", function(){
			it("onTrack() should be true", function() {
				assert.isTrue(model.onTrack(x,--y));
			});
			it("Node at 5,3 should be removed", function() {
				assert.equal(model.pointer.pos[0], 5);
				assert.equal(model.pointer.pos[1], 2);
			});
			it("should not change lastX", function() {
				assert.equal(model.lastX, x);
			});
			it("should change lastY to "+y, function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction should be north", function(){
				assert.equal(model.currentDir, directionCode.north);
			});
			it("Backtrack direction should be west", function() {
				assert.equal(model.backtrackDir, directionCode.west);
			});
			it("A node should be visited", function(){
				assert.isTrue(model.nodeRevisited);
			});
		});
		describe("move to 3,2", function(){
			it("onTrack() should be true", function() {
				assert.isTrue(model.onTrack(x = 3,2));
			});
			it("Node at 5,2 should be removed", function() {
				assert.equal(model.pointer.pos[0], 1);
				assert.equal(model.pointer.pos[1], 2);
			});
			it("should change lastX to "+x, function() {
				assert.equal(model.lastX, x);
			});
			it("should not change lastY", function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction should be west", function(){
				assert.equal(model.currentDir, directionCode.west);
			});
			it("Backtrack direction should be west", function() {
				assert.equal(model.backtrackDir, directionCode.west);
			});
			it("nodeRevisited() should be false", function(){
				assert.isFalse(model.nodeRevisited);
			});
		});
		describe("move to 3,3", function(){
			it("onTrack() should be false", function() {
				assert.isFalse(model.onTrack(3, y = 3));
			});
			it("should add a new node at 3,2", function() {
				assert.equal(model.pointer.pos[0], 3);
				assert.equal(model.pointer.pos[1], 2);
			});
			it("should not change lastX", function() {
				assert.equal(model.lastX, x);
			});
			it("should change lastY to "+y, function() {
				assert.equal(model.lastY, y);
			});
			it("Current direction should be south", function(){
				assert.equal(model.currentDir, directionCode.south);
			});
			it("Backtrack direction should be north", function() {
				assert.equal(model.backtrackDir, directionCode.north);
			});
			it("nodeRevisited() should be false", function(){
				assert.isFalse(model.nodeRevisited);
			});
		});

	});
});
