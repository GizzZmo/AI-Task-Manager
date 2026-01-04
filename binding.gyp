{
  "targets": [
    {
      "target_name": "guardian",
      "conditions": [
        [
          "OS==\"win\"",
          {
            "sources": [
              "native/guardian_agent.cpp"
            ],
            "libraries": [
              "wintrust.lib",
              "crypt32.lib",
              "psapi.lib"
            ],
            "defines": [
              "UNICODE",
              "_UNICODE",
              "NAPI_VERSION=8",
              "BUILDING_NODE_EXTENSION"
            ],
            "cflags_cc": [
              "-std=c++20"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": [
                  "/std:c++20"
                ]
              }
            }
          },
          {
            "sources": [
              "native/guardian_stub.cpp"
            ],
            "defines": [
              "NAPI_VERSION=8",
              "BUILDING_NODE_EXTENSION"
            ]
          }
        ]
      ]
    }
  ]
}
