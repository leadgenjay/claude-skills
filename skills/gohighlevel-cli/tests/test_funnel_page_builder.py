import unittest

from cli_anything.gohighlevel.utils.funnel_page_builder import build_page_data


class FunnelPageBuilderDesignRegressionTests(unittest.TestCase):
    def test_centered_image_emits_runtime_centering_and_spacing(self):
        spec = {"sections": [{"rows": [{"columns": [{"elements": [{
            "type": "image",
            "url": "https://example.test/logo.png",
            "alt": "Example logo",
            "width": "152px",
            "align": "center",
        }]}]}]}]}

        data = build_page_data(spec, page_id="p", funnel_id="f", location_id="l")
        section = data["sections"][0]
        image = next(node for node in section["elements"] if node.get("meta") == "image")

        self.assertEqual(image["wrapper"]["textAlign"]["value"], "center")
        self.assertEqual(image["wrapper"]["marginBottom"]["value"], 20)
        self.assertIn(
            f".{image['id']} img{{display:block;margin-left:auto;margin-right:auto}}",
            section["general"]["sectionStyles"],
        )


if __name__ == "__main__":
    unittest.main()
