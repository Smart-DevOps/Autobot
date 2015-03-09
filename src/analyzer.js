var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
//var faker = require("faker");
var fs = require("fs");
//faker.locale = "en";
//var mock = require('mock-fs');
var _ = require('underscore');

var object; //main test object

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["backtrack.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases(filePath)

}

//check whether string is pure number!
function isInt(value) {
	var er = /^-?[0-9]+$/;
	return er.test(value);
}

// internal fuzzer
// minimun value is 0
function fuzzer(value)
{
	var random = Math.random();

	if (random <= 0.333) //30% -1
	{
		value--;
	}
	else if (random <= 0.666) //30% +1
	{
		value++;
	}
	// 30% unchanged

	return (value < 0 ? 0 : value);

}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	},
	fileWithoutContent:
	{
		pathContent: 
		{	
  			file1: '',
		}
	}
};

function generateTestCases(filePath)
{
	console.log("---- Generating test cases... ----");

	var content = "var backtrack = require('./../src/"+filePath+"');\n";
	content += "var subject = new "+object+"();\n";

	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params, list identifiers only in their parametric order!
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			//params[paramName] = '\'\''; //will print ''

			if (paramName == 'x' || paramName == 'y' || paramName == 'node')
			{
				params[paramName] = paramName;
			}
			else
			{
				params[paramName] = '\'\'';
			}
		}

		console.log(funcName+": ");
		console.log(params);

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		//var fileWithContent = _.some(constraints, {mocking: 'fileWithContent' });
		//var pathExists      = _.some(constraints, {mocking: 'fileExists' });


		//the number of constraints in each function "funcName"
		for( var c = 0; c < constraints.length; c++ )
		{
			
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) && isInt(constraint.value)) //constraint identifier & is number 
			{
				params[constraint.ident] = constraint.value;
				console.log(" >>> constraint.ident:"+ constraint.ident + " constraint.value:"+constraint.value);
			}
		}

		// Prepare function arguments, convert array 2 CSV
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");

		console.log("arguments: "+args);
		
	
		// Search function
		if (funcName == "getDirection")
		{

			console.log("Found function "+funcName)
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );

			//in case there are more than one phone area!
			for( var c = 0; c < constraints.length; c++ )
			{
			
				var constraint = constraints[c];
			
				//find area constraints
				if (constraint.ident == 'area')
				{

					console.log(funcName +" >>> constraint.ident:"+ constraint.ident + " constraint.value:"+constraint.value);

					

					content += "subject.{0}({1});\n".format(funcName, fakeNumber);
				}	
			}
		}
		else if (params.hasOwnProperty('x') != -1 || params.hasOwnProperty('y') != -1) //if function contains x or y aka vector
		{
			//fuzzer!
			var x = 10;
			var y = 10;
			var paramsCheck = args.split(",");
			for (var i =0; i < paramsCheck.length; i++)
			{
				var tmp = new Array(paramsCheck.length);
				//prepare new array each time
				for (var j=0; j < paramsCheck.length; j++)
				{
					var chk = paramsCheck[j];
					if (chk == 'x')
					{
						tmp[j] = (x = fuzzer(x));
					}
					else if (chk == 'y')
					{
						tmp[j] = (y = fuzzer(y));
					}
					else if (chk == 'node')
					{
						tmp[j] = "subject.tree";
					}
					else
					{
						tmp[j] = '\'\'';
					}
				}

				content += "subject.{0}({1});\n".format(funcName, tmp.join(","));

			}
		}
		else //the rest of functions
		{
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );

			//create combination of args!
			var paramsCheck = args.split(",");
			for (var i =0; i < paramsCheck.length; i++)
			{
				var tmp = new Array(paramsCheck.length);
				//prepare new array each time
				for (var j=0; j < paramsCheck.length; j++)
				{
					tmp[j] = '\'\'';
				}
				
				var chk = paramsCheck[i];
				if (chk != '\'\'')
				{
					if (isInt(chk)) //if contains number
					{
						tmp[i] = String(Number(chk) + 1); // + 1
						content += "subject.{0}({1});\n".format(funcName, tmp.join(","));

						tmp[i] = String(Number(chk) - 1); // + 1
						content += "subject.{0}({1});\n".format(funcName, tmp.join(","));
					}
					else
					{
						tmp[i] = chk;
						content += "subject.{0}({1});\n".format(funcName, tmp.join(","));
					}
				}
			}
		}
	}


	fs.writeFileSync('./../test/test.js', content, "utf8");

}


function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	//
	// Search single root function expression first
	//
	var key;
	var node;
	for (key in result.body) {
		node = result.body[key];
		if (node.type === 'ExpressionStatement' && node.expression.type === "AssignmentExpression" 
			&& node.expression.right.type === 'FunctionExpression')
		{
			object = node.expression.left.object.name + "." + node.expression.left.property.name;
			console.log("The root function is "+object);
		}
	}


	traverse(result, function (node) 
	{

		//
		// Search public accessible functions inside the objects, this.funcName = function(params) {}
		//
		if (node.type === 'ExpressionStatement' && node.expression.type === "AssignmentExpression" 
			&& node.expression.right.type === 'FunctionExpression' && node.expression.left.object.type === "ThisExpression" ) 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.expression.right.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument. Only search first layer!
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1) //process ident found in params
					{console.log(">> found operator.............. == and left identifier:" + child.left.name);
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.name,
								value: rightHand
							});
					}

					//
					// Special rule to find BlackListNumber
					//
					else if (child.left.type == 'Identifier' && child.left.name == "area") //process ident called "area"
					{console.log(">> found keyword.............. phone number:" + child.left.name);
						//
						//
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.name,
								value: rightHand
							});
					}
				}

				if( child.type === 'BinaryExpression' && child.operator == "<")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1) //process ident found in params
					{console.log(">> found operator.............. < and left identifier:" + child.left.name);
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.name,
								value: rightHand
							});
					}
				}

				if( child.type === 'BinaryExpression' && child.operator == ">")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1) //process ident found in params
					{console.log(">> found operator.............. > and left identifier:" + child.left.name);
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.name,
								value: rightHand
							});
					}
				}
				
				if( child.type === 'LogicalExpression' && child.operator == "||")
				{
					//
					// Two side of logical expression should be unary expression
					//
					if (child.left.type == "UnaryExpression") //determine if left side is Unary Expression
					{
						if (child.left.argument.type == "Identifier" && params.indexOf( child.left.argument.name) > -1)
						{console.log(">> found operator.............. || and left expression identifier:" + child.left.argument.name);
							//
							//
							functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.argument.name,
								value: 1
							});
						}
					}
					//
					// Two side of logical expression should be unary expression
					//
					if (child.right.type == "UnaryExpression") //determine if left side is Unary Expression
					{
						if (child.right.argument.type == "MemberExpression" && child.right.argument.object.type == "Identifier")
						{	
							if (params.indexOf( child.right.argument.object.name) > -1)
							{console.log(">> found member expression object name:" + child.right.argument.object.name);
							//
							//
								functionConstraints[funcName].constraints.push( 
								{
									ident: child.right.argument.object.name,
									value: "{\'"+child.right.argument.property.name+"\':1}"
								});
							}
						}
					}
				}

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'pathContent/file1'",
								mocking: 'fileWithContent'
							});
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'path/fileExists'",
								mocking: 'fileExists'
							});
						}
					}
				}

			});

			console.log(functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.expression.left.property.type == "Identifier")
	{
		return node.expression.left.property.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();