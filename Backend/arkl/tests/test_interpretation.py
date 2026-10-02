from arkl.services.interpretation import interpret_rq


def test_rq_below_one_interpretation():
    assert interpret_rq("0.99") == "WITHIN_REFERENCE_LEVEL"


def test_rq_equal_one_interpretation():
    assert interpret_rq("1") == "WITHIN_REFERENCE_LEVEL"


def test_rq_above_one_interpretation():
    assert interpret_rq("1.01") == "ABOVE_REFERENCE_LEVEL"
