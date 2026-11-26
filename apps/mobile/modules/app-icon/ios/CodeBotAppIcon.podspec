Pod::Spec.new do |s|
  s.name           = 'CodeBotAppIcon'
  s.version        = '1.0.0'
  s.summary        = 'App icon selection for CodeBot'
  s.description    = 'Reads and selects the alternate app icon that the user selects in Settings.'
  s.license        = 'PolyForm-Noncommercial-1.0.0'
  s.author         = 'CodeBot'
  s.homepage       = 'https://openbot.run'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.swift"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
