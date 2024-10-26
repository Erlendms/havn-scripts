(() => {
		"use strict";

		// ---------- DEMO OF COPY BIKE AS MARKDOWN ----------

		ObjC.import("AppKit");

		// A basic `Copy As Markdown` serialization of the
		// selection in a [Bike]( Build 22 ) outline window.

		// Top N levels used as MD heading levels
		// (Except for any quote or code lines at those levels)

		// Next level (N + 1) used as paragraphs.
		// (Use a blank line in Bike to delimit paragraphs)

		// All levels below paragraphs are interpreted as
		// nested lists - bulleted by default, but adopting
		// any numeric list prefixes (numbers followed by
		// dot and space) that are found in the outline.


		// Rob Trew @2022
		// Draft ver 0.005

		// --------------------- OPTIONS ---------------------

		const howManyHeadingLevels = 6;
		const startHeadingLevel = 1;

		// Set this to true if you don't have Keyboard Maestro
		// installed, or prefer to use the values above
		// directly, rather than than import values set in KM.
		// (See the readSettings function below)
		const ignoreKeyboardMaestro = false;


		//  DEMO: copy Bike selection as Markdown

		// main :: IO ()
		const main = () => {
				Application("Bike").activate();

				const
						se = Application("System Events"),
						[
								nHeadingLevels, topHeadingLevel
						] = readSettings(ignoreKeyboardMaestro);

				return (
						$.NSPasteboard.generalPasteboard.clearContents,
						se.keystroke("c", {
								using: "command down"
						}),
						// Increase to 0.2 etc if copy is ever missed.
						delay(0.1),
						either(
								alert("Copy as Markdown from Bike.app")
						)(
								md => Object.assign(
										Application.currentApplication(), {
												includeStandardAdditions: true
										}
								).displayNotification(md, {
										withTitle: "Copied as Markdown",
										subtitle: "Bike selection:"
								})
						)(
								bindLR(
										clipOfTypeLR("com.hogbaysoftware.bike.xml")
								)(
										xml => bindLR(
												markdownFromBikeStringLR(
														nHeadingLevels
												)(
														topHeadingLevel
												)(xml)
										)(
												compose(Right, copyText)
										)
								)
						)
				);
		};


		// readSettings :: Bool -> IO (Int, Int)
		const readSettings = ignoreKM =>
				// Reading the global option settings
				// at the top of the script.
				ignoreKM ? (
						[howManyHeadingLevels, startHeadingLevel]
				) : kmOrManualSettings([
						[
								"HowManyHeadingLevels", howManyHeadingLevels
						],
						[
								"TopHeadingLevel", startHeadingLevel
						]
				]);


		// headingListFromSettings :: Int -> Int -> [String]
		const headingListFromSettings = nLevels =>
				// The list of hash heading levels required.
				nFirst => enumFromTo(nFirst)(
						nFirst + (nLevels - 1)
				)
				.map(n => `${"#".repeat(n)} `);


		// kmOrManualSettings ::
		// ((String, Int), (String, Int)) -> IO (Int, Int)
		const kmOrManualSettings = ([kvLevels, kvTop]) =>
				appIsInstalled(
						"com.stairways.keyboardmaestro.engine"
				) ? (() => {
						const
								kmVar = Application(
										"Keyboard Maestro Engine"
								).getvariable;

						return [kvLevels, kvTop].map(
								([k, n]) => parseInt(kmVar(k), 10) || n
						);
				})() : [kvLevels, kvTop].map(ab => ab[1]);


		// --------------- MARKDOWN FROM BIKE ----------------

		// -- TOP N OUTLINE LEVELS USED FOR HEADINGS
		// -- (Excepting code and quote nodes at those levels)
		// -- THEN PARAGRAPHS OF TEXT
		// -- AND BELOW THAT, NESTED BULLET LISTS

		// markdownFromBikeHTML :: Int -> Int ->
		// HTML String -> Either String MD String
		const markdownFromBikeStringLR = nHeadingLevels =>
				// A basic Markdown translation of the bike HTML
				// using the top N levels of the Bike outline as
				// MD headings. topLevel gives the length of the
				// shortest MD hash heading used.
				topLevel => bikeHTML => {
						const
								hashHeadings = headingListFromSettings(
										nHeadingLevels
								)(topLevel);

						return bindLR(treeFromBikeStringLR(bikeHTML))(
								tree => Right(
										// Each node decorated with an
										// outline level property.
										treeWithLevels(0)(
												// Contiguous runs of Quote and Code
												// lines consolidated to single nodes.
												mdBlockedTree(tree)
										)
										// Markdown rendering with heading prefixes
										// for top N levels.
										.nest.map(mdFromTree(hashHeadings))
										.join("\n")
								)
						);
				};


		// mdFromTree :: [String] ->
		// Tree {text::String, level::Int} -> String
		const mdFromTree = hashPrefixes =>
				// A basic Markdown serialization of a tree of
				// {text, level} dictionaries, in which hashPrefixes,
				// a list of length N, contains the MD prefixes for
				// the top N levels of the tree, which are to be
				// interpreted as headings.
				// No inline formatting (links etc) is attempted.
				tree => foldTree(
						node => mds => (
								Boolean(node.text.trim())
						) ? (
								["code", "quote"].includes(node.mdType) ? (
										node.text
								) : levelNodeMD(hashPrefixes)(node)(
										mds.join("")
								)
						) : `\n${mds.join("")}\n`
				)(tree)
				// With any excessive gaps trimmed out.
				.replace(/\n{3,}/gu, "\n\n");


		// levelNodeMD :: [String] ->
		// {text::String, level::Int} -> String -> String
		const levelNodeMD = hashPrefixes =>
				// Markdown representation of a given tree node
				// based on the level of its nesting,
				// and the given number and length of hashPrefixes.
				node => subMD => {
						const
								level = node.level,
								nHashLevels = hashPrefixes.length,
								paraLevel = nHashLevels + 1,
								pfx = level < paraLevel ? (
										hashPrefixes[level - 1]
								) : level === paraLevel ? (
										""
								) : "    ".repeat(
										(level - paraLevel) - 1
								),
								txt = node.text.trim(),
								mdtxt = `${pfx}${txt}`;

						return level < paraLevel ? (
								level === nHashLevels ? (
										lowestHeading(mdtxt)(subMD)
								) : `${mdtxt}\n\n${subMD}`
						) : level === paraLevel ? (
								paragraphLine(txt)(subMD)
						) : listItem(pfx)(txt)(subMD);
				};


		// listItem :: String -> String ->
		// String -> String
		const listItem = pfx =>
				// List items are bulleted unless they already
				// start with an integer string followed by a dot
				// with trailing space.
				txt => subMD => (/^\d+\.\s+/u).test(txt) ? (
						`${pfx}${txt}\n${subMD}`
				) : `${pfx}- ${txt}\n${subMD}`;


		// lowestHeading :: String -> String -> String
		const lowestHeading = mdtxt =>
				// Any paragraphs under these headings are followed
				// (as well as preceded) by two blank lines.
				subMD => Boolean(subMD) ? (
						`${mdtxt}\n\n${subMD}\n\n`
				) : `${mdtxt}\n\n`;


		// paragraphLine :: String -> String -> String
		const paragraphLine = txt =>
				// Lines of text, possibly interspersed with
				// nests of bulleted or enumerated lists.
				subMD => Boolean(subMD) ? (
						// Any line descendents will be lists.
						`${txt}\n\n${subMD}\n`
						// Quote or code lines are \n delimited,
				) : txt.startsWith(">") || txt.startsWith("`") ? (
						`${txt}\n`
						// but plain sentences are space-delimited.
				) : `${txt} `;


		// ------------ MD CODE AND QUOTE BLOCKS -------------

		// mdBlockedTree :: Tree Dict -> Tree Dict
		const mdBlockedTree = tree => {
				// A copy of the tree with any code-fenced peer
				// sequences or quote lines runs (at any level) are
				// collapsed to single leaf nodes with outline
				// text values in their roots.
				const go = x =>
						Node(x.root)(
								mdBlockedForest(x.nest)
								.map(mdBlockedTree)
						);

				return go(tree);
		};


		// mdBlockedForest :: Forest Dict -> Forest Dict
		const mdBlockedForest = forest =>
				// A copy of the list of tree nodes in which any
				// runs of quote or code nodes have been collapsed
				// to single nodes which with multiline texts.
				groupBy(
						on(a => b => a === b)(
								x => x.root.mdType
						)
				)(mdBlockTypedForest(forest))
				.flatMap(gp => {
						const typeName = gp[0].root.mdType;

						return ["code", "quote"].includes(
								typeName
						) ? (() => {
								const
										blockOutline = forestOutline("    ")(
												x => x.text
										)(gp);

								return [Node({
										text: `${blockOutline}\n`,
										mdType: typeName
								})([])];
						})() : gp;
				});


		// mdBlockTypedForest :: Forest NodeValue ->
		// Forest NodeValue
		const mdBlockTypedForest = forest => {
				// A copy of the list of tree nodes in which all
				// top level nodes in the list are flagged with
				// mdType: ("quote" | "code" | "other")
				const typedTree = ([inCode, inQuote]) => tree => {
						const
								text = tree.root.text,
								isCode = text.startsWith("```") ? (
										!inCode
								) : inCode,
								isQuote = isCode ? (
										false
								) : inQuote ? (
										Boolean(text)
								) : text.startsWith(">");

						return Tuple([isCode, isQuote])(
								typedNode(inCode)(isCode)(isQuote)(tree)
						);
				};

				return snd(mapAccumL(typedTree)([false, false])(
						forest
				));
		};


		// typedNode :: Bool -> Bool -> Bool ->
		// Tree Dict -> Tree Dict
		const typedNode = inCode =>
				isCode => isQuote => tree => Node(
						Object.assign({}, tree.root, {
								mdType: (isCode || inCode) ? (
										"code"
								) : isQuote ? (
										"quote"
								) : "other"
						})
				)(tree.nest);


		// ---------------------- BIKE -----------------------

		// treeFromBikeStringLR :: Bike String ->
		// Either String [Tree String]
		const treeFromBikeStringLR = s => {
				const
						error = $(),
						node = $.NSXMLDocument.alloc
						.initWithXMLStringOptionsError(
								s, 0, error
						);

				return node.isNil() ? (() => {
						const
								problem = ObjC.unwrap(
										error.localizedDescription
								);

						return Left(
								`Not parseable as Bike:\n\n${problem}`
						);
				})() : treeFromBikeXMLNodeLR(node);
		};


		// treeFromBikeXMLNodeLR :: XML Node ->
		// Either String Tree String
		const treeFromBikeXMLNodeLR = xmlRootNode => {
				const
						unWrap = ObjC.unwrap,
						topNode = xmlRootNode.childAtIndex(0);

				return bindLR(
						"html" === unWrap(topNode.name) ? (
								Right(topNode.childAtIndex(1))
						) : Left("Expected top-level <html> node.")
				)(body => bindLR(
						"body" === unWrap(body.name) ? (
								Right(body.childAtIndex(0))
						) : Left("Expected a <body> node in bike HTML.")
				)(topUL => "ul" === unWrap(topUL.name) ? (
						Right(
								Node({
										id: attribVal(topUL)("id"),
										text: "[Virtual Root]"
								})(unWrap(topUL.children).map(
										lineTree
								))
						)
				) : Left("Expected a top <ul> node in bike HTML.")));
		};


		// lineTree :: XMLNode LI -> Tree String
		const lineTree = node => {
				const
						unWrap = ObjC.unwrap,
						pNode = node.childAtIndex(0);

				return Node(
						unWrap(node.attributes).reduce(
								(a, attrib) => Object.assign(a, {
										[unWrap(attrib.name)]: unWrap(
												attrib.stringValue
										)
								}), {
										text: unWrap(pNode.stringValue)
								}
						)
				)(
						1 < parseInt(node.childCount, 10) ? (
								unWrap(pNode.nextSibling.children)
								.map(lineTree)
						) : []
				);
		};


		// attribVal :: XMLNode -> String -> String
		const attribVal = xmlNode =>
				// The value of a named attribute of the XML node.
				k => ObjC.unwrap(
						xmlNode.attributeForName(k).stringValue
				) || "";


		// ---------------- LIBRARY FUNCTIONS ----------------

		// ----------------------- JXA -----------------------
		// https://github.com/RobTrew/prelude-jxa

		// alert :: String => String -> IO String
		const alert = title =>
				s => {
						const sa = Object.assign(
								Application("System Events"), {
										includeStandardAdditions: true
								});

						return (
								sa.activate(),
								sa.displayDialog(s, {
										withTitle: title,
										buttons: ["OK"],
										defaultButton: "OK"
								}),
								s
						);
				};


		// appIsInstalled :: String -> Bool
		const appIsInstalled = bundleID =>
				Boolean(
						$.NSWorkspace.sharedWorkspace
						.URLForApplicationWithBundleIdentifier(
								bundleID
						)
						.fileSystemRepresentation
				);


		// clipOfTypeLR :: String -> Either String String
		const clipOfTypeLR = utiOrBundleID => {
				const
						clip = ObjC.deepUnwrap(
								$.NSString.alloc.initWithDataEncoding(
										$.NSPasteboard.generalPasteboard
										.dataForType(utiOrBundleID),
										$.NSUTF8StringEncoding
								)
						);

				return 0 < clip.length ? (
						Right(clip)
				) : Left(
						"No clipboard content found " + (
								`for type '${utiOrBundleID}'`
						)
				);
		};


		// copyText :: String -> IO String
		const copyText = s => {
				const pb = $.NSPasteboard.generalPasteboard;

				return (
						pb.clearContents,
						pb.setStringForType(
								$(s),
								$.NSPasteboardTypeString
						),
						s
				);
		};

		// --------------------- GENERIC ---------------------
		// https://github.com/RobTrew/prelude-jxa

		// Left :: a -> Either a b
		const Left = x => ({
				type: "Either",
				Left: x
		});


		// Node :: a -> [Tree a] -> Tree a
		const Node = v =>
				// Constructor for a Tree node which connects a
				// value of some kind to a list of zero or
				// more child trees.
				xs => ({
						type: "Node",
						root: v,
						nest: xs || []
				});


		// Right :: b -> Either a b
		const Right = x => ({
				type: "Either",
				Right: x
		});


		// Tuple (,) :: a -> b -> (a, b)
		const Tuple = a =>
				// A pair of values, possibly of
				// different types.
				b => ({
						type: "Tuple",
						"0": a,
						"1": b,
						length: 2,
						*[Symbol.iterator]() {
								for (const k in this) {
										if (!isNaN(k)) {
												yield this[k];
										}
								}
						}
				});


		// bindLR (>>=) :: Either a ->
		// (a -> Either b) -> Either b
		const bindLR = m =>
				mf => m.Left ? (
						m
				) : mf(m.Right);


		// compose (<<<) :: (b -> c) -> (a -> b) -> a -> c
		const compose = (...fs) =>
				// A function defined by the right-to-left
				// composition of all the functions in fs.
				fs.reduce(
						(f, g) => x => f(g(x)),
						x => x
				);


		// either :: (a -> c) -> (b -> c) -> Either a b -> c
		const either = fl =>
				// Application of the function fl to the
				// contents of any Left value in e, or
				// the application of fr to its Right value.
				fr => e => e.Left ? (
						fl(e.Left)
				) : fr(e.Right);


		// enumFromTo :: Int -> Int -> [Int]
		const enumFromTo = m =>
				n => Array.from({
						length: 1 + n - m
				}, (_, i) => m + i);


		// foldTree :: (a -> [b] -> b) -> Tree a -> b
		const foldTree = f => {
				// The catamorphism on trees. A summary
				// value obtained by a depth-first fold.
				const go = tree => f(
						root(tree)
				)(
						nest(tree).map(go)
				);

				return go;
		};


		// forestOutline :: String -> (a -> String) ->
		// Forest a -> String
		const forestOutline = indentUnit =>
				// An indented outline of the nodes
				// (each stringified by f) of a forest.
				f => forest => forest.flatMap(
						foldTree(
								x => xs => 0 < xs.length ? [
										f(x), ...xs.flat(1)
										.map(s => `${indentUnit}${s}`)
								] : [f(x)]
						)
				).join("\n");


		// groupBy :: (a -> a -> Bool) -> [a] -> [[a]]
		const groupBy = eqOp =>
				// A list of lists, each containing only elements
				// equal under the given equality operator,
				// such that the concatenation of these lists is xs.
				xs => 0 < xs.length ? (() => {
						const [h, ...t] = xs;
						const [groups, g] = t.reduce(
								([gs, a], x) => eqOp(x)(a[0]) ? (
										Tuple(gs)([...a, x])
								) : Tuple([...gs, a])([x]),
								Tuple([])([h])
						);

						return [...groups, g];
				})() : [];


		// mapAccumL :: (acc -> x -> (acc, y)) -> acc ->
		// [x] -> (acc, [y])
		const mapAccumL = f =>
				// A tuple of an accumulation and a list
				// obtained by a combined map and fold,
				// with accumulation from left to right.
				acc => xs => [...xs].reduce(
						([a, bs], x) => second(
								v => bs.concat(v)
						)(
								f(a)(x)
						),
						Tuple(acc)([])
				);


		// nest :: Tree a -> [a]
		const nest = tree =>
				tree.nest;


		// on :: (b -> b -> c) -> (a -> b) -> a -> a -> c
		const on = f =>
				// e.g. groupBy(on(eq)(length))
				g => a => b => f(g(a))(g(b));


		// snd :: (a, b) -> b
		const snd = tpl =>
				// Second member of a pair.
				tpl[1];


		// treeWithLevels :: Int -> Tree Dict -> Tree Dict
		const treeWithLevels = topLevel =>
				// A tree in which each root dictionary is
				// decorated with an integer 'level' value,
				// where the level of the top node is given,
				// the level of its children is topLevel + 1,
				// and so forth downwards.
				tree => {
						const go = level =>
								node => {
										const
												nodeRoot = node.root,
												fullLevel = parseInt(
														nodeRoot.indent, 10
												) || level;

										return Node(
												Object.assign({}, nodeRoot, {
														level: fullLevel
												})
										)(
												node.nest.map(go(1 + fullLevel))
										);
								};

						return go(topLevel)(tree);
				};


		// root :: Tree a -> a
		const root = tree =>
				// The value attached to a tree node.
				tree.root;


		// second :: (a -> b) -> ((c, a) -> (c, b))
		const second = f =>
				// A function over a simple value lifted
				// to a function over a tuple.
				// f (a, b) -> (a, f(b))
				([x, y]) => Tuple(x)(f(y));


		// MAIN
		return main();
})();