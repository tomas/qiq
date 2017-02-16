dist: index.js
	@echo "Generating distribution files..."
	@rm -Rf dist && mkdir -p dist
	@cat index.js > dist/qiq.js
	@./node_modules/uglify-js/bin/uglifyjs --compress --mangle -- index.js > dist/qiq.min.js

test:
	@./node_modules/.bin/mocha \
		--require should \
		--reporter spec

.PHONY: test
