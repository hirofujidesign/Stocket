function runAuto() {
    var result = $('input[name="searchTerm"]').val();
    var queryURL = '/search/' + result;
    console.log(queryURL)

    $.ajax({
        url: queryURL,
        success: function (result) {
            console.log(result);
            //clear; suggestions will appear as radio buttons upon typing in search term
            $("#hintOne").html();
            $("#hintOneName").html()
            $('#hintTwo').html();
            $('#hintTwoName').html();

            var firstSuggest = result.suggestions[0].data;
            var firstSuggestName = result.suggestions[0].value;


            $("#hintOne").html("<div class='radio'><input type='radio' name='hint' value='" + firstSuggest + "' checked='checked'>" + firstSuggest + "<br><p>" + firstSuggestName + "</p></div>");

            var secondSuggest = result.suggestions[1].data;
            var secondSuggestName = result.suggestions[1].value;


            $("#hintTwo").html("<div class= 'radio'><input type='radio' name='hint' value='" + secondSuggest + "'>" + secondSuggest + "<br><p>" + secondSuggestName + "</p></div>");
        }
    });
};

// set date values to current
// have to change how pagination pulls dates before using or it breaks
// $(document).ready(function () {
//     var now = new Date();

//     var day = ("0" + now.getDate()).slice(-2);
//     var month = ("0" + (now.getMonth() + 1)).slice(-2);

//     var today = now.getFullYear() + "-" + (month) + "-" + (day);
//     $('input[name="beginDate"]').val(today);
//     $('input[name="endDate"]').val(today);
// });
