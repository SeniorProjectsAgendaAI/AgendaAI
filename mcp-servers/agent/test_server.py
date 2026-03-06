
import google.generativeai as genai
from server import _convert_type


def test_convert_type_mapping():

    assert _convert_type("string") == genai.protos.Type.STRING
    assert _convert_type("integer") == genai.protos.Type.INTEGER
    assert _convert_type("boolean") == genai.protos.Type.BOOLEAN
    assert _convert_type("object") == genai.protos.Type.OBJECT
    assert _convert_type("unknown_type") == genai.protos.Type.STRING
