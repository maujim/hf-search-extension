# HF Search Extension Makefile
#
# Build targets:
#   make chrome   - Build extension for Chrome
#   make firefox  - Build extension for Firefox
#   make edge     - Build extension for Edge
#   make pack chrome|firefox|edge - Build and package as .zip
#   make clean    - Remove build artifacts

.PHONY: chrome firefox edge pack clean assert

# Copy core framework to extension
extension/core:
	@rm -rf extension/core
	@cp -r core/src extension/core

chrome: clean
	@jsonnet -J core manifest.jsonnet --ext-str browser=chrome -o extension/manifest.json

firefox: clean
	@jsonnet -J core manifest.jsonnet --ext-str browser=firefox -o extension/manifest.json

edge: clean
	@jsonnet -J core manifest.jsonnet --ext-str browser=edge -o extension/manifest.json

clean: extension/core
	@rm -rf extension/manifest.json

pack:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Usage: make pack <browser>  (e.g., make pack chrome)"; \
		exit 1; \
	fi
	@$(MAKE) $(filter-out $@,$(MAKECMDGOALS))
	@web-ext build -s extension -n $(filter-out $@,$(MAKECMDGOALS))-hf-search-extension-{version}.zip -o

# Accept extra arguments silently
%:
	@:
