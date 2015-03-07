var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}


function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
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

function generateTestCases()
{
	console.log("---- Generating test cases... ----");

	var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params, list identifiers only in their parametric order!
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\''; //will print ''
		}

		console.log(params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {mocking: 'fileWithContent' });
		var pathExists      = _.some(constraints, {mocking: 'fileExists' });


		//the number of constraints in each function "funcName"
		for( var c = 0; c < constraints.length; c++ )
		{
			
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) ) //constraint identifier
			{
				params[constraint.ident] = constraint.value;
				console.log(funcName +" >>> constraint.ident:"+ constraint.ident + " constraint.value:"+constraint.value);
			}
		}

		// Prepare function arguments, convert array 2 CSV
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");

		console.log("arguments: "+args);
		
		if( pathExists || fileWithContent )
		{
			var fileHasContent = 1; //file may be empty

			content += generateMockFsTestCases(pathExists,fileWithContent,funcName, args, fileHasContent);
			// Bonus...generate constraint variations test cases....
			content += generateMockFsTestCases(!pathExists,!fileWithContent,funcName, args, fileHasContent);
			content += generateMockFsTestCases(pathExists,!fileWithContent,funcName, args, fileHasContent);
			content += generateMockFsTestCases(!pathExists,fileWithContent,funcName, args, fileHasContent);

			// file may be empty
			content += generateMockFsTestCases(pathExists,fileWithContent,funcName, args, !fileHasContent);

		}
		// Test BlackListNumber function
		else if (funcName == "blackListNumber")
		{

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

					var fakeNumber = faker.phone.phoneNumber('#######');

					fakeNumber = constraint.value.substring(0,4) + fakeNumber.substring(5,-1) + "\"";

					content += "subject.{0}({1});\n".format(funcName, fakeNumber);
				}	
			}
		}

		else //the rest of functions
		{
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );

			//check whether string is pure number!
			function isInt(value) {
				var er = /^-?[0-9]+$/;
				return er.test(value);
			}

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


	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists,fileWithContent,funcName,args, fileHasContent) 
{
	var testCase = "";
	// Insert mock data based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}

	if( fileWithContent )
	{
		if (fileHasContent)
		{
			for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		}
		else
		{
			for (var attrname in mockFileLibrary.fileWithoutContent) { mergedFS[attrname] = mockFileLibrary.fileWithoutContent[attrname]; }
		}
	}
	

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument. Only search first layer!
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1) //process ident found in params
					{console.log("found operator.............. == and left name:" + child.left.name);
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
					{console.log("found keyword.............. phone number:" + child.left.name);
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
					{console.log("found operator.............. < and left name:" + child.left.name);
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
					{console.log("found operator.............. > and left name:" + child.left.name);
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
						{console.log("found operator.............. || and left expression name:" + child.left.argument.name);
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
							{console.log("found member expression object name:" + child.right.argument.object.name);
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

			console.log( functionConstraints[funcName]);

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
	if( node.id )
	{
		return node.id.name;
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