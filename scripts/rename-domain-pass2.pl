#!/usr/bin/env perl
# Pass 2: clean up the rename leftovers.
# Uses \Q \E for literal matching to avoid @ interpolation.

use strict;
use warnings;

my @files = `grep -rln --include='*.ts' --include='*.tsx' --include='*.md' --include='*.txt' --include='*.js' --include='*.json' 'getgetcollectly' src/ launch/ outreach/ 2>/dev/null | grep -v node_modules | grep -v '.next/'`;
push @files, `grep -rln --include='*.ts' --include='*.tsx' --include='*.md' --include='*.txt' --include='*.js' --include='*.json' -E 'collectly\\.app' src/ launch/ outreach/ 2>/dev/null | grep -v node_modules | grep -v '.next/' | grep -v 'dev-auth\\.ts'`;

my %seen;
my @clean = grep { !$seen{$_}++ } @files;
chomp @clean;

my $updated = 0;
for my $f (@clean) {
    next if $f eq 'src/db/dev-auth.ts' || $f eq '';
    open(my $in, '<', $f) or next;
    local $/;
    my $before = <$in>;
    close $in;

    my $after = $before;
    # 1. getgetcollectly -> getcollectly
    $after =~ s/getgetcollectly\.app/getcollectly.app/g;
    # 2. dynamic mailto: ${...}@collectly.app   (use chr(64) for @)
    my $at = chr(64);
    $after =~ s/([\}%])$at collectly\.app/$1$at getcollectly.app/g;
    # 3. bare "collectly.app" preceded by start, space, or punctuation
    $after =~ s/(\A|[\s"',.:;!?\(\{])collectly\.app/$1getcollectly.app/g;
    # 4. display text in mailto: link
    $after =~ s/(mailto:[a-zA-Z0-9._-]+$at getcollectly\.app[^>]*>)(\s*)([^<]*$at)collectly\.app/$1$2$3getcollectly.app/g;

    if ($before ne $after) {
        open(my $out, '>', $f) or next;
        print $out $after;
        close $out;
        $updated++;
        print "  $f\n";
    }
}
print "Pass 2 updated $updated files\n";
