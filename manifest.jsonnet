// Format: jsonnetfmt -i manifest.jsonnet

local manifest_v3 = import 'core/manifest_v3.libsonnet';

local icons() = {
  '16': 'assets/icon-16.png',
  '48': 'assets/icon-48.png',
  '128': 'assets/icon-128.png',
};

local name = 'HF Search Extension';
local version = '0.1.0';
local keyword = 'hf';
local description = 'HF Search Extension - search Hugging Face from your address bar';

local browser = std.extVar('browser');

local json = if std.member(['chrome', 'edge'], browser) then
  manifest_v3.new(name, keyword, description, version, service_worker='service-worker.js')
else
  manifest_v3.new(name, keyword, description, version, background_page='firefox-bg.html') { browser_specific_settings: {
    gecko: {
      id: '{04188724-64d3-497b-a4fd-7caffe6eab29}',
      strict_min_version: '109.0',
    },
  } };

json {
  description: 'A browser extension to search Hugging Face models, datasets, and more from the address bar.',
}
.addIcons(icons())
.addPermissions(['storage'])
