#include <node_api.h>

namespace
{
    napi_value SampleOnce(napi_env env, napi_callback_info /*info*/)
    {
        napi_throw_error(env, nullptr, "Guardian native module is only available on Windows builds.");
        return nullptr;
    }

    napi_value Init(napi_env env, napi_value exports)
    {
        napi_value fn;
        napi_create_function(env, "sampleOnce", NAPI_AUTO_LENGTH, SampleOnce, nullptr, &fn);
        napi_set_named_property(env, exports, "sampleOnce", fn);
        return exports;
    }
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
