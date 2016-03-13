
"use strict";

var lines_animation = {

	lines : [],
	LINE_N_MAX : 40, // may be exceeded
	status : "none", // "none", "autoSplit", "manualSplit", "merge"
	LINE_WIDTH_NON_CROSS : 4,
	LINE_WIDTH_CROSS : 6,
	line_width : 0,
	RADIUS_WIDTH_RATIO : 0.75,
	CIRCLE_RADIUS : 0,
	FORTH : 0,
	LEFT : 1,
	RIGHT : 2,
	STOP : -1,
	DIR_N : 3,
	LINE_GROW_UNIT : [
		{ x : 0, y : -2 },
		{ x : -Math.SQRT2 * 2, y : -Math.SQRT2 * 2 },
		{ x : Math.SQRT2 * 2, y : -Math.SQRT2 * 2 }
	],

	LINE_INTERVAL_WIDTH_RATIO : 1.5,
	LINE_INTERVAL : 0,
	LINE_INTERVAL_SQUARE : 0,
	canvas : null,
	context : null,
	CANVAS_BASELINE_HEIGHT : 5,
	CANVAS_WIDTH : 800,
	CANVAS_HEIGHT : 400,
	CANVAS_EDGE_LEFT : 0,
	CANVAS_EDGE_RIGHT : 0,
	frame_no : 0,
	TIME_INTERVAL_FAST : 5,
	TIME_INTERVAL_SLOW : 10,
	time_interval : 0,
	timer : 0,
	LINES_TOP : 0, // the (smallest) y coordinate of the highest line

	DIR_RATE : [
		[ 96,  2,  2 ],
		[ 10, 90,  0 ],
		[ 10,  0, 90 ]
	],

	SPLIT_RATE : 0.01,
	split_rate : 0,
	cross_mode : false,

	start : function() {
		this.initialize();
/*
		var i;
		for (i = 0; i < 100; i++)
			this.update_draw();
*/
		this.timer = setInterval(this.update_draw, this.time_interval);
	},

	initialize : function() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.CANVAS_WIDTH;
		this.canvas.height = this.CANVAS_HEIGHT + this.CANVAS_BASELINE_HEIGHT;
		this.context = this.canvas.getContext("2d");
		document.body.insertBefore(this.canvas, document.body.childNodes[0]);
		this.lines[0] = new Line(this.CANVAS_WIDTH / 2);
		this.CIRCLE_RADIUS = this.LINE_WIDTH_NON_CROSS * this.RADIUS_WIDTH_RATIO;
		this.LINE_INTERVAL = this.LINE_WIDTH_NON_CROSS * this.LINE_INTERVAL_WIDTH_RATIO;
		this.LINE_INTERVAL_SQUARE = Math.pow(this.LINE_INTERVAL, 2);
		this.CANVAS_EDGE_LEFT = -this.LINE_INTERVAL;
		this.CANVAS_EDGE_RIGHT = this.CANVAS_WIDTH - this.CANVAS_EDGE_LEFT;
		this.LINES_TOP = this.CANVAS_HEIGHT * 0.05;
		this.line_width = this.LINE_WIDTH_NON_CROSS;
		this.context.lineCap = "round";
		this.split_rate = this.SPLIT_RATE;
		this.time_interval = this.TIME_INTERVAL_SLOW;
	},

	update_draw : function() {

		var thiss = lines_animation; // the reference "this" is not lines_animation since the method is called by setInterval
		var lines = thiss.lines;
		var lines_n = lines.length;
		var i = 0;
		var permutation = [], new_lines = [];
		var canvas_speed = 0, lines_top_new = 0, lines_top_new_temp = 0;
		var ctx = thiss.context;
		var floor_func = Math.floor;
		var index = 0, temp = null;
		var color_interval = 0, color = 0;
		var l_p = null, l_p_len = 0;
		
		document.getElementById("lines_n").innerHTML = lines_n;
		for (i = 0; i < lines_n; i++) {
			lines[i].index = i;
			permutation[i] = lines[i];
		}
		shuffle(permutation);
		
		lines_top_new = thiss.LINES_TOP;
		for (i = 0; i < lines_n; i++)
			if ((lines_top_new_temp = permutation[i].grow(new_lines)) < lines_top_new)
				lines_top_new = lines_top_new_temp;
		new_lines.sort(
			function(a, b){
				if (a.index == b.index)
					if (a.dir == lines_animation.RIGHT)
						return -1;
					else
						return 1;
				return a.index - b.index; 
			}
		);
		for (i = new_lines.length - 1; i >= 0; i--)
			lines.splice(new_lines[i].index, 0, new_lines[i]);
		shuffle(new_lines);
		lines_n = new_lines.length;
		for (i = 0; i < lines_n; i++) {
			if ((lines_top_new_temp = new_lines[i].grow(new_lines)) < lines_top_new)
				lines_top_new = lines_top_new_temp;
		}
		canvas_speed = thiss.LINES_TOP - lines_top_new; // positive value

		thiss.context.clearRect(0, 0, thiss.CANVAS_WIDTH, thiss.CANVAS_HEIGHT);
		ctx.lineWidth = thiss.line_width;
		color_interval = 255 / (lines.length * 4 / 3);
		color = 255 / 4;
		ctx.ctx
		for (i = 0; i < lines.length; i++, color += color_interval)
			if (!lines[i].move_draw(canvas_speed, floor_func(color))) {
				lines.splice(i, 1);
				i--;
			}

		lines_n = lines.length;
		for (i = 0; i < lines_n; i++)
			if (lines[i].status == "stop") {
				ctx.beginPath();
				l_p = lines[i].line_pieces;
				l_p_len = l_p.length;
				ctx.arc(l_p[l_p_len - 1].x, l_p[l_p_len - 1].y, lines_animation.CIRCLE_RADIUS, 0, 2*Math.PI);
				ctx.fillStyle = "purple";
				ctx.fill();
				ctx.strokeStyle = "purple";
				ctx.stroke();
			}

		ctx.fillStyle = "#4dd2ff";
		ctx.fillRect(0, thiss.CANVAS_HEIGHT, thiss.CANVAS_WIDTH, thiss.CANVAS_BASELINE_HEIGHT);
	}

};

function Line(x_or_line, dir, new_line_index) {

	var i = 0, n = 0, l_p_this = null, l_p_other = null;

	this.index = 0; // only reliable in two situations
	this.line_pieces = []; // store n line pieces by storing n+1 points
	this.dir = 0; // FORTH, LEFT, RIGHT
	this.status = ""; // free, intoLeft, intoRight, fromLeft, fromRight, stop, branch
	this.merge_target = null; // target line that this line will merge into

	if (typeof x_or_line == "number") { // the first line
		this.line_pieces[0] = new Point(x_or_line, lines_animation.canvas.height);
		this.line_pieces[1] = new Point(x_or_line, lines_animation.canvas.height - 2);
		this.dir = lines_animation.FORTH;
		this.status = "free";
	} else { // line split from another line
		this.index = new_line_index;
		l_p_this = this.line_pieces;
		l_p_other = x_or_line.line_pieces;
		n = l_p_other.length;
		for (i = 0; i < n; i++)
			l_p_this[i] = new Point(l_p_other[i].x, l_p_other[i].y);
		this.dir = dir;
		this.status = "branch";
	}

	this.grow = function(new_lines) {

		var i = 0;
		var rand = 0;
		var rand_func = Math.random;
		var dir_choises = [];

		var STOP = lines_animation.STOP;
		var new_dir = 0;
		var new_line_dir = 0;
		var DIR_N = lines_animation.DIR_N;
		var LINE_GROW_UNIT = lines_animation.LINE_GROW_UNIT;
		var lines = lines_animation.lines;
		var DIR_RATE = lines_animation.DIR_RATE;

		var l_p = null;
		var l_p_len = 0;
		var l_p_top = null;

		var split = false;
		var new_line = null;

		if (this.status == "stop")
			return lines_animation.CANVAS_HEIGHT;

		if (lines.length < lines_animation.LINE_N_MAX && this.dir == lines_animation.FORTH && rand_func() < lines_animation.split_rate) {
			new_line_dir = (rand_func() < 0.5) ? lines_animation.LEFT : lines_animation.RIGHT;
			new_lines[new_lines.length] = new Line(this, new_line_dir, this.index + ((new_line_dir == lines_animation.LEFT) ? 0 : 1));
			split = true;
		}

		// decide next direction
		new_dir = STOP;
		for (i = 0; i < DIR_N; i++)
			dir_choises[i] = true;
		while (new_dir == STOP && (rand = this.choises_rate_sum(dir_choises, DIR_RATE, DIR_N)) > 0) {
			rand *= rand_func();
			for (i = 0; i < DIR_N; i++)
				if (dir_choises[i])
					if ((rand -= DIR_RATE[this.dir][i]) < 0)
						if (this.check_new_dir(i, this.index, LINE_GROW_UNIT, dir_choises)) {
							new_dir = i;
							break;
						}
		}

		if (new_dir == STOP) {
			this.status = "stop";
			return lines_animation.CANVAS_HEIGHT;
		}

		l_p = this.line_pieces;
		l_p_len = l_p.length;
		l_p_top = l_p[l_p_len - 1];

		if (new_dir == this.dir && !split && this.status != "branch") {
			l_p_top.x += LINE_GROW_UNIT[new_dir].x;
			l_p_top.y += LINE_GROW_UNIT[new_dir].y;
			return l_p_top.y;
		}

		l_p[l_p_len] = new Point(l_p_top.x + LINE_GROW_UNIT[new_dir].x, l_p_top.y + LINE_GROW_UNIT[new_dir].y);
		this.dir = new_dir;
		this.status = "free";
		return l_p[l_p_len].y;

	}

	this.choises_rate_sum = function(dir_choises, DIR_RATE, DIR_N) {
		var i = 0, sum = 0;
		for (i = 0; i < DIR_N; i++)
			if (dir_choises[i])
				sum += DIR_RATE[this.dir][i];
		return sum;
	}

	this.check_new_dir = function(dir, line_id, LINE_GROW_UNIT, choises) {

		var FORTH = lines_animation.FORTH;
		var LEFT = lines_animation.LEFT;
		var RIGHT = lines_animation.RIGHT;
		var l_p = this.line_pieces;
		var p = new Point(l_p[l_p.length - 1].x + LINE_GROW_UNIT[dir].x, l_p[l_p.length - 1].y + LINE_GROW_UNIT[dir].y)
		
		if (dir == FORTH) {
			if (this.check_crash(line_id, LEFT, p)) {
				choises[FORTH] = choises[LEFT] = false;
				return false;
			}
			if (this.check_crash(line_id, RIGHT, p)) {
				choises[FORTH] = choises[RIGHT] = false;
				return false;
			}
			return true;
		}

		if (dir == LEFT) {
			if (p.x < lines_animation.CANVAS_EDGE_LEFT || this.check_crash(line_id, LEFT, p))
				choises[LEFT] = false;
			return choises[LEFT];
		}

		// RIGHT
		if (p.x > lines_animation.CANVAS_EDGE_RIGHT || this.check_crash(line_id, RIGHT, p))
			choises[RIGHT] = false;
		return choises[RIGHT];

	}

	this.check_crash = function(line_id, dir, p) {

		if (lines_animation.cross_mode)
			return false;

		var lines = lines_animation.lines;
		var lines_n = lines.length;
		var INTERVAL = lines_animation.LINE_INTERVAL;
		var INTERVAL_SQUARE = lines_animation.LINE_INTERVAL_SQUARE;
		var i = 0;//, j = 0;
		var l_p_other = null;
		var l_p_other_len = null;
		var threshold_point = p;
		var bound_y = p.y - INTERVAL;

		if (dir == lines_animation.LEFT)
			for (i = line_id - 1; i >= 0 && threshold_point.y > bound_y; i--) {
				l_p_other = lines[i].line_pieces;
				l_p_other_len = l_p_other.length;
				if (this.check_crash_part(l_p_other, l_p_other_len, threshold_point, p, bound_y))
					return true;
				if (l_p_other[l_p_other_len - 1].y <= threshold_point.y)
					threshold_point = l_p_other[l_p_other_len - 1];
			}
		else // dir == RIGHT
			for (i = line_id + 1; i < lines_n && threshold_point.y > bound_y; i++) {
				l_p_other = lines[i].line_pieces;
				l_p_other_len = l_p_other.length;
				if (this.check_crash_part(l_p_other, l_p_other_len, threshold_point, p, bound_y))
					return true;
				if (l_p_other[l_p_other_len - 1].y <= threshold_point.y)
					threshold_point = l_p_other[l_p_other_len - 1];
			}
		return false;

	}

	this.check_crash_part = function(l_p_other, l_p_other_len, threshold_point, p, bound_y) {
		var j = 0;
		for (j = l_p_other_len - 1; j > 0 && l_p_other[j].y <= threshold_point.y; j--)
			if (l_p_other[j - 1].y > bound_y && this.crash(p, l_p_other[j], l_p_other[j - 1]))
				return true;
		return false;
	}

	this.crash = function(p, l1, l2) {

		var px = p.x, py = p.y, l1x = l1.x, l1y = l1.y, l2x = l2.x, l2y = l2.y;
		var INTERVAL = lines_animation.LINE_INTERVAL;
		var INTERVAL_SQUARE = lines_animation.LINE_INTERVAL_SQUARE;

		if (this.distance_square(p, l1) < INTERVAL_SQUARE || this.distance_square(p, l2) < INTERVAL_SQUARE) {
			return true;
		}

		// do not use == with floating numbers
		if (Math.abs((l1x - l2x) / (l1y - l2y)) < 0.1) // vertical
			if (Math.abs(px - l1x) < INTERVAL && (py - l1y) * (py - l2y) <= 0)
				return true;
			else
				return false;

		// do not use == with floating numbers
		if ((l1x - l2x) * (l1y - l2y) > 0) // slope = 1
			if (Math.abs((px - py) - (l1x - l1y)) < INTERVAL_SQUARE && ((px + py) - (l1x + l1y)) * ((px + py) - (l2x + l2y)) <= 0)
				return true;
			else
				return false;

		// slope = -1
		if (Math.abs((px + py) - (l1x + l1y)) < INTERVAL_SQUARE && ((py - px) - (l1y - l1x)) * ((py - px) - (l2y - l2x)) <= 0)
			return true;
		return false;

	}

	this.distance_square = function(p1, p2) {
		return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
	}

	this.move_draw = function(canvas_speed, color) {
		// canvas_speed is positive

		var l_p = this.line_pieces;
		var l_p_len = l_p.length;
		var i = 0;
		var canvas_height = lines_animation.canvas.height;
		var ctx = lines_animation.context;

		l_p[l_p_len - 1].y += canvas_speed;
		for (i = l_p_len - 1; i > 0; i--) {

			if (l_p[i].y > canvas_height)
				break;
			l_p[i - 1].y += canvas_speed;

			ctx.beginPath();
			ctx.moveTo(l_p[i - 1].x, l_p[i - 1].y);
			ctx.lineTo(l_p[i].x, l_p[i].y);
			ctx.strokeStyle = "rgb(32, " + color + ", 32)";
			ctx.stroke();

		}

		l_p.splice(0, i);
		if (l_p.length == 1)
			return false; // to be removed
		return true;
	
	}

}

function Point(x, y) {
	this.x = x;
	this.y = y;
}

function shuffle(arr) {
	var temp = null, i = 0, index = 0;
	var floor_func = Math.floor, rand_func = Math.random;
	for (i = arr.length - 1; i >= 1; i--) {
		index = floor_func(rand_func() * (i + 1));
		temp = arr[i];
		arr[i] = arr[index];
		arr[index] = temp;
	}
}

function pause_resume() {
	var button = document.getElementById("pause_resume");
	if (button.innerHTML == "Pause") {
		clearInterval(lines_animation.timer);
		lines_animation.timer = -1;
		button.innerHTML = "Resume";
	} else {
		lines_animation.timer = setInterval(lines_animation.update_draw, lines_animation.time_interval);
		button.innerHTML = "Pause";
	}
}

function change_speed() {
	var button = document.getElementById("change_speed");
	if (button.innerHTML == "Speed Up") {
		lines_animation.time_interval = lines_animation.TIME_INTERVAL_FAST;
		button.innerHTML = "Speed Down";
	} else {
		lines_animation.time_interval = lines_animation.TIME_INTERVAL_SLOW;
		button.innerHTML = "Speed Up";
	}
	if (lines_animation.timer != -1) {
		clearInterval(lines_animation.timer);
		lines_animation.timer = setInterval(lines_animation.update_draw, lines_animation.time_interval);
	}
}

function cross_mode() {
	var my_div;
	lines_animation.cross_mode = true;
	lines_animation.line_width = lines_animation.LINE_WIDTH_CROSS;
	my_div = document.getElementById("my_div");
	my_div.removeChild(document.getElementById("cross_mode"));
}

// remember hoisting
// unify coding style
// mutiple layers
// pattern
// obstacle
// centerlize the canvas
// put button to left lower part
// #line to the top left
// only one line for the canvas border
// fate stay night
// still some branches crossing
