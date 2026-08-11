# HF Search Extension Makefile
#
# Build targets:
#   make chrome   - Build extension for Chrome
#   make firefox  - Build extension for Firefox
#   make edge     - Build extension for Edge
#   make pack chrome|firefox|edge - Build and package as .zip
#   make clean    - Remove build artifacts

.PHONY: chrome firefox edge pack clean core-sync assert

# Copy core framework to extension
core-sync: clean
	@cp -r core/src extension/core

chrome: core-sync
	@jsonnet -J core manifest.jsonnet --ext-str browser=chrome -o extension/manifest.json

firefox: core-sync
	@jsonnet -J core manifest.jsonnet --ext-str browser=firefox -o extension/manifest.json

edge: core-sync
	@jsonnet -J core manifest.jsonnet --ext-str browser=edge -o extension/manifest.json

clean:
	@rm -rf extension/manifest.json extension/core

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

