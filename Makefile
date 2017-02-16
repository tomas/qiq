dist: index.js
	@echo "Generating distribution files..."
	@rm -Rf dist && mkdir -p dist
	@cat index.js > dist/minstache.js
	@./node_modules/uglify-js/bin/uglifyjs --compress --mangle -- index.js > dist/minstache.min.js

test:
	@./node_modules/.bin/mocha \
		--require should \
		--reporter spec

.PHONY: test
